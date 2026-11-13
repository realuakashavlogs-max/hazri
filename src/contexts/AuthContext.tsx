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
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Failed to restore Supabase session:', error.message);
        }

        if (session?.user) {
          const profile = await authService.getProfileFromAuthUser(session.user);
          if (mounted) setUser(profile);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to init session:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await authService.getProfileFromAuthUser(session.user);
        if (mounted) {
          setUser(profile);
          setLoading(false);
        }
      } else if (mounted) {
        setUser(null);
        setInspectedUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
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
    if (updated) {
      setUser(updated);
    } else {
      setUser((prev) => (prev ? { ...prev, full_name: fullName } : prev));
    }
  };

  const effectiveUserId =
    user?.role === 'admin' && inspectedUser ? inspectedUser.id : user?.id || '';

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
