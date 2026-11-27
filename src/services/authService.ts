import type { User } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  getGoogleOAuthRedirectUrl,
} from '../lib/supabaseClient';
import type { AuthUser, UserRole } from '../types/database';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export function mapSupabaseUser(authUser: User, role: UserRole = 'user'): AuthUser {
  const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const avatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: typeof metaName === 'string' && metaName.trim() ? metaName.trim() : null,
    avatar_url: typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null,
    role,
  };
}

export const authService = {
  async fetchUserRole(userId: string): Promise<UserRole> {
    if (!isSupabaseConfigured || !supabase || !userId) return 'user';
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data) return 'user';
      return data.role === 'admin' ? 'admin' : 'user';
    } catch {
      return 'user';
    }
  },

  async signInWithGoogle(): Promise<void> {
    ensureConfigured();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getGoogleOAuthRedirectUrl(),
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },
};

