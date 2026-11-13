import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Profile } from '../types/database';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfileName: (fullName: string) => Promise<void>;
  inspectedUser: Profile | null;
  setInspectedUser: (user: Profile | null) => void;
  effectiveUserId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectedUser, setInspectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured) {
          const signedOut = localStorage.getItem('hazri_demo_signed_out') === 'true';
          const stored = localStorage.getItem('hazri_demo_user');
          if (stored) {
            setUser(JSON.parse(stored));
          } else if (!signedOut) {
            const defaultUser: Profile = {
              id: 'teacher_demo_01',
              email: 'teacher@hazribook.com',
              full_name: 'Ustadh Ahmad',
              role: 'user',
              is_blocked: false,
              created_at: new Date().toISOString(),
            };
            localStorage.setItem('hazri_demo_user', JSON.stringify(defaultUser));
            setUser(defaultUser);
          }
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await authService.getProfile(session.user.id);
            if (mounted) setUser(profile);
          }
        }
      } catch (err) {
        console.error('Failed to init session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await authService.getProfile(session.user.id);
          if (mounted) setUser(profile);
        } else {
          if (mounted) setUser(null);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const profile = await authService.signIn(email, pass);
    setUser(profile);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const res = await authService.signUp(email, pass, name);
    if (res.profile) {
      setUser(res.profile);
    }
    return { needsEmailConfirmation: res.needsEmailConfirmation };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setInspectedUser(null);
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword);
  };

  const updateProfileName = async (fullName: string) => {
    if (!user) return;
    const updated = await authService.updateProfileName(user.id, fullName);
    if (updated) setUser(updated);
  };

  const effectiveUserId = inspectedUser?.id || user?.id || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfileName,
        inspectedUser,
        setInspectedUser,
        effectiveUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
