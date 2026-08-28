import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';
import { Database } from './types';

// Public-by-design Supabase project values. The URL and anon key ship in every
// client bundle, so hardcoding the fallback is safe. Vercel project env can
// inject a publishable key (not a URL) into VITE_SUPABASE_URL; validate before use.
const DEFAULT_SUPABASE_URL = 'https://tobclczszdikmgvkvngf.supabase.co';

function resolveSupabaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return raw;
      }
    } catch {
      // Not a parseable URL — fall through to default.
    }
    console.warn(`Invalid VITE_SUPABASE_URL (${raw}). Falling back to ${DEFAULT_SUPABASE_URL}.`);
  }
  return DEFAULT_SUPABASE_URL;
}

const SUPABASE_URL = resolveSupabaseUrl();
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