import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';
import { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Supabase credentials missing. App may not function correctly. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

const isBrowser = typeof window !== 'undefined';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'sb-auth-token',
    storage: isBrowser ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      'x-client-info': 'web-browser',
    },
  },
});

export type AuthUser = User;
export type AuthSession = Session;

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('Get user error:', error.message);
    return null;
  }
  return user;
}

export async function refreshSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('Refresh session error:', error.message);
    return null;
  }
  return session;
}