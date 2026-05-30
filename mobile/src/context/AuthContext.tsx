import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { setApiAccessToken } from '../api/client';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  full_name?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromSession(session: Session | null): User | null {
  const authUser = session?.user;
  if (!authUser?.email) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    full_name:
      (authUser.user_metadata?.full_name as string | undefined) ||
      (authUser.user_metadata?.name as string | undefined) ||
      authUser.email.split('@')[0]
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function applySession(session: Session | null) {
    const nextToken = session?.access_token ?? null;
    setToken(nextToken);
    setApiAccessToken(nextToken);
    setUser(userFromSession(session));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signUp: async (email: string, password: string, fullName?: string) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName || email.split('@')[0] }
          }
        });
        if (error) throw error;
        if (!data.session) {
          throw new Error('Account aangemaakt. Bevestig eerst je e-mail of zet e-mailbevestiging uit in Supabase tijdens de MVP-test.');
        }
        applySession(data.session);
      },
      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
        if (error) throw error;
        applySession(data.session);
      },
      logout: async () => {
        await supabase.auth.signOut();
        applySession(null);
      }
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
