import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSigningOut: boolean;
  signUp: (email: string, password: string, displayName: string, termsVersion?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);
  const hasSeenAuthenticatedSessionRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const isSigningOut = isSigningOutRef.current;
        if (isSigningOut && event !== 'SIGNED_OUT') return;

        // During HMR and refresh churn, Supabase can emit TOKEN_REFRESHED with null
        // before auth state settles. Ignore this transient event to prevent route jumps.
        if (event === 'TOKEN_REFRESHED' && !session) return;

        if (event === 'SIGNED_OUT') {
          const hadAuthenticatedSession = hasSeenAuthenticatedSessionRef.current;
          hasSeenAuthenticatedSessionRef.current = false;

          setSession(null);
          setUser(null);
          setLoading(false);
          isSigningOutRef.current = false;
          setIsSigningOut(false);

          // Ignore startup SIGNED_OUT events when no authenticated session has been observed.
          if (isSigningOut || hadAuthenticatedSession) {
            window.location.href = '/';
          }
          return;
        }

        setSession(session);
        if (session?.user) {
          hasSeenAuthenticatedSessionRef.current = true;
        }
        // Only update user state if the identity actually changed,
        // preventing a full re-render cascade on routine token refreshes.
        setUser(prev => {
          const next = session?.user ?? null;
          if (prev?.id === next?.id) return prev;
          return next;
        });
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isSigningOutRef.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      hasSeenAuthenticatedSessionRef.current = !!session?.user;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, termsVersion?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
          ...(termsVersion ? { terms_version_accepted: termsVersion } : {}),
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (isSigningOutRef.current) return;

    isSigningOutRef.current = true;
    setIsSigningOut(true);

    // Immediately reflect signed-out state in UI while Supabase completes logout.
    setSession(null);
    setUser(null);
    setLoading(false);

    try {
      await supabase.auth.signOut();
    } finally {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
      window.location.href = '/';
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isSigningOut, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
