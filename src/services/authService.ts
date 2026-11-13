import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Profile } from '../types/database';

function buildFallbackUserProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}): Profile {
  const metaName = authUser.user_metadata?.full_name;
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: typeof metaName === 'string' && metaName.trim() ? metaName.trim() : null,
    role: 'user',
    is_blocked: false,
    created_at: authUser.created_at || new Date().toISOString(),
  };
}

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ profile: Profile | null; needsEmailConfirmation: boolean }> {
    ensureConfigured();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed: no user returned');

    // If email confirmation is enabled in Supabase, session will be null
    if (!authData.session) {
      return { profile: null, needsEmailConfirmation: true };
    }

    const profile = await this.getProfileFromAuthUser(authData.user);
    return { profile, needsEmailConfirmation: false };
  },

  async signIn(email: string, password: string): Promise<Profile> {
    ensureConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned after login');

    return this.getProfileFromAuthUser(data.user);
  },

  async signOut(): Promise<void> {
    try {
      localStorage.removeItem('hazri_demo_user');
      localStorage.removeItem('hazri_demo_signed_out');
    } catch {
      // Ignore storage access errors
    }

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

  async getProfileFromAuthUser(authUser: Pick<User, 'id' | 'email' | 'user_metadata' | 'created_at'>): Promise<Profile> {
    ensureConfigured();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn(
          '[Auth] Could not load profiles row; treating user as normal user.',
          error.message
        );
        return buildFallbackUserProfile(authUser);
      }

      if (!data) {
        console.warn(
          '[Auth] profiles row not found for user; treating user as normal user.',
          authUser.id
        );
        return buildFallbackUserProfile(authUser);
      }

      return {
        ...data,
        role: data.role === 'admin' ? 'admin' : 'user',
        is_blocked: Boolean(data.is_blocked),
      };
    } catch (err) {
      console.warn('[Auth] Unexpected error reading profiles table; treating user as normal user.', err);
      return buildFallbackUserProfile(authUser);
    }
  },

  async getProfile(userId: string): Promise<Profile | null> {
    ensureConfigured();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] Error fetching profile:', error.message);
        return null;
      }
      if (!data) return null;

      return {
        ...data,
        role: data.role === 'admin' ? 'admin' : 'user',
        is_blocked: Boolean(data.is_blocked),
      };
    } catch (err) {
      console.warn('[Auth] Unexpected error fetching profile:', err);
      return null;
    }
  },

  async updateProfileName(userId: string, fullName: string): Promise<Profile | null> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data
      ? {
          ...data,
          role: data.role === 'admin' ? 'admin' : 'user',
          is_blocked: Boolean(data.is_blocked),
        }
      : null;
  },
};
