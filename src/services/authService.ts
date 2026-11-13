import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Profile } from '../types/database';

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ profile: Profile | null; needsEmailConfirmation: boolean }> {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('hazri_demo_signed_out');
      const mockProfile: Profile = {
        id: 'demo_' + Date.now(),
        email,
        full_name: fullName,
        role: 'user',
        is_blocked: false,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('hazri_demo_user', JSON.stringify(mockProfile));
      return { profile: mockProfile, needsEmailConfirmation: false };
    }

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return {
        profile: {
          id: authData.user.id,
          email: authData.user.email || email,
          full_name: fullName,
          role: 'user',
          is_blocked: false,
          created_at: new Date().toISOString(),
        },
        needsEmailConfirmation: false,
      };
    }

    return { profile, needsEmailConfirmation: false };
  },

  async signIn(email: string, password: string): Promise<Profile> {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('hazri_demo_signed_out');
      const isAdmin =
        email.toLowerCase().includes('admin') ||
        email.toLowerCase() === 'realuakashavlogs@gmail.com';
      const mockProfile: Profile = {
        id: isAdmin ? 'admin_demo_01' : 'teacher_demo_01',
        email,
        full_name: isAdmin ? 'App Administrator' : 'Ustadh Ahmad',
        role: isAdmin ? 'admin' : 'user',
        is_blocked: false,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('hazri_demo_user', JSON.stringify(mockProfile));
      return mockProfile;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned after login');

    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error('Profile record not found');
    return profile;
  },

  async signOut(): Promise<void> {
    localStorage.removeItem('hazri_demo_user');
    localStorage.setItem('hazri_demo_signed_out', 'true');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('hazri_demo_user');
      return stored ? JSON.parse(stored) : null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async updateProfileName(userId: string, fullName: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('hazri_demo_user');
      if (!stored) return null;
      const parsed: Profile = { ...JSON.parse(stored), full_name: fullName };
      localStorage.setItem('hazri_demo_user', JSON.stringify(parsed));
      return parsed;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
