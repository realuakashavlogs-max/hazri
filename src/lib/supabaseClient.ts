import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('your-project-id')
);

// Create the Supabase client if configured, or a dummy client if not
export const supabase = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
      },
    });
