import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AuthUser } from '../types/database';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export function mapSupabaseUser(authUser: User): AuthUser {
  const metaName = authUser.user_metadata?.full_name;
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: typeof metaName === 'string' && metaName.trim() ? metaName.trim() : null,
  };
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthUser> {
    ensureConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned after login');

    return mapSupabaseUser(data.user);
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  async resetPassword(email: string): Promise<void> {
    ensureConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string): Promise<void> {
    ensureConfigured();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};
