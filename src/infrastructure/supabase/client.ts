import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-zlelin.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = getSupabaseClient();
