-- ===================================================================
-- ZLELIN SPATIAL WORKSPACE - SUPABASE DATABASE SCHEMA MIGRATION
-- ===================================================================

-- 1. Create Public Profiles Table linked to Auth Users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  status text default 'online',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Create Friendships Table
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, friend_id)
);

-- Enable RLS for Friendships
alter table public.friendships enable row level security;

create policy "Users can view their own friendships" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can insert friendship requests" on public.friendships
  for insert with check (auth.uid() = user_id);

create policy "Users can update friendship status" on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete friendships" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);
