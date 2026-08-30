import { create } from 'zustand';
import { UserProfile } from '@/domain/auth';
import { supabase, isSupabaseConfigured } from '@/infrastructure/supabase/client';

interface AuthStoreState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  authMode: 'login' | 'register';
  
  // Actions
  setAuthModalOpen: (open: boolean, mode?: 'login' | 'register') => void;
  setProfileModalOpen: (open: boolean) => void;
  initializeAuth: () => Promise<void>;
  signInWithPassword: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, pass: string, username: string, fullName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthModalOpen: false,
  isProfileModalOpen: false,
  authMode: 'login',

  setAuthModalOpen: (open, mode = 'login') => {
    set({ isAuthModalOpen: open, authMode: mode });
  },

  setProfileModalOpen: (open) => {
    set({ isProfileModalOpen: open });
  },

  initializeAuth: async () => {
    set({ isLoading: true });

    if (!isSupabaseConfigured) {
      // Fallback demo user if Supabase env keys are not added yet
      set({
        user: {
          id: 'demo-user-123',
          email: 'clara@zlelin.app',
          username: 'clara',
          fullName: 'Clara Oswald',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          status: 'online',
        },
        isLoading: false,
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({
          user: {
            id: user.id,
            email: user.email || '',
            username: profile?.username || user.email?.split('@')[0] || 'user',
            fullName: profile?.full_name || user.user_metadata?.full_name || 'Anonymous',
            avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            status: 'online',
          },
          isLoading: false,
        });
      } else {
        set({ user: null, isLoading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user = session.user;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          set({
            user: {
              id: user.id,
              email: user.email || '',
              username: profile?.username || user.email?.split('@')[0] || 'user',
              fullName: profile?.full_name || user.user_metadata?.full_name || 'Anonymous',
              avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              status: 'online',
            },
          });
        } else {
          set({ user: null });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithPassword: async (email, password) => {
    if (!isSupabaseConfigured) {
      // Demo authentication simulation
      set({
        user: {
          id: 'demo-user-' + Date.now(),
          email,
          username: email.split('@')[0],
          fullName: email.split('@')[0],
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          status: 'online',
        },
        isAuthModalOpen: false,
      });
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ isAuthModalOpen: false });
    return {};
  },

  signUpWithPassword: async (email, password, username, fullName) => {
    if (!isSupabaseConfigured) {
      set({
        user: {
          id: 'demo-user-' + Date.now(),
          email,
          username,
          fullName,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          status: 'online',
        },
        isAuthModalOpen: false,
      });
      return {};
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
      },
    });

    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        full_name: fullName,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });
    }

    set({ isAuthModalOpen: false });
    return {};
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({
        user: {
          id: 'google-user-' + Date.now(),
          email: 'google.user@gmail.com',
          username: 'googleuser',
          fullName: 'Google User',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          status: 'online',
        },
        isAuthModalOpen: false,
      });
      return {};
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      },
    });

    if (error) return { error: error.message };
    return {};
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ user: null });
  },

  updateProfile: async (partial) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const updated = { ...currentUser, ...partial };
    set({ user: updated });

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({
        username: updated.username,
        full_name: updated.fullName,
        avatar_url: updated.avatarUrl,
      }).eq('id', currentUser.id);
    }
  },
}));
