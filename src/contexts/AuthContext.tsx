import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../types/database';
import { authService, mapSupabaseUser } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { clearOfflineDataForUser } from '../lib/offlineQueue';

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function clearRuntimeDataCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith('workbox-precache') && !k.startsWith('google-fonts'))
        .map((k) => window.caches.delete(k))
    );
  } catch {
    // Ignore cache API errors
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function hydrateSessionUser(sessionUser: NonNullable<Parameters<typeof mapSupabaseUser>[0]> | null) {
      if (!sessionUser) {
        if (mounted) setUser(null);
        return;
      }
      const role = await authService.fetchUserRole(sessionUser.id);
      if (mounted) {
        setUser(mapSupabaseUser(sessionUser, role));
      }
    }

    async function initAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Failed to restore Supabase session:', error.message);
        }

        if (mounted) {
          const mapped = session?.user ? mapSupabaseUser(session.user) : null;
          prevUserIdRef.current = mapped?.id ?? null;
          setUser(mapped);
          if (session?.user) {
            void hydrateSessionUser(session.user);
          }
        }
      } catch (err) {
        console.error('Failed to init session:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ? mapSupabaseUser(session.user) : null;
      const nextId = nextUser?.id ?? null;
      if (prevUserIdRef.current && prevUserIdRef.current !== nextId) {
        const oldUserId = prevUserIdRef.current;
        queryClient.clear();
        void clearOfflineDataForUser(oldUserId);
        void clearRuntimeDataCaches();
      }
      prevUserIdRef.current = nextId;
      setUser(nextUser);
      setLoading(false);
      if (session?.user) {
        void hydrateSessionUser(session.user);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    const currentUserId = user?.id || prevUserIdRef.current || undefined;
    try {
      await authService.signOut();
    } finally {
      queryClient.clear();
      await clearOfflineDataForUser(currentUserId);
      await clearRuntimeDataCaches();
      prevUserIdRef.current = null;
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        loading,
        signInWithGoogle,
        signOut,
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
