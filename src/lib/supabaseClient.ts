import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// These are Supabase's public project URL and publishable (browser-safe) key.
// Never place a service_role or secret key in this file.
const PROJECT_URL = 'https://mspwlahheyzpyizdkktk.supabase.co';
const PROJECT_PUBLISHABLE_KEY = 'sb_publishable_wpWlPVadm7YmKDDs7Tg9UA_sLRbYQgh';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || PROJECT_URL).trim();
export const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || PROJECT_PUBLISHABLE_KEY
).trim();

export const PRODUCTION_DASHBOARD_URL = 'https://hazri.suffah.workers.dev/dashboard';

export function getGoogleOAuthRedirectUrl(): string {
  if (import.meta.env.PROD) {
    return PRODUCTION_DASHBOARD_URL;
  }
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    const isLocal =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocal) {
      return `${origin}/dashboard`;
    }
  }
  return PRODUCTION_DASHBOARD_URL;
}

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('your-project-id')
);

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : (null as unknown as SupabaseClient<Database>);
