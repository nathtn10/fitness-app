/**
 * Auth state. A thin wrapper over the backend adapter's auth methods.
 *
 * When the backend isn't configured (`isBackendConfigured === false`), this is
 * inert: `enabled` is false, there's never a session, and the app runs in its
 * original local-only mode with no auth gate.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getApiClient } from '../api/supabaseClient';
import type { ApiError, AuthSession } from '../api';
import { isBackendConfigured } from '../config';

interface AuthStoreValue {
  /** Whether cloud features are available at all (env configured). */
  enabled: boolean;
  loading: boolean;
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<ApiError | null>;
  signUp: (email: string, password: string) => Promise<ApiError | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthStoreValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isBackendConfigured);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    if (!isBackendConfigured) return;
    let cancelled = false;
    (async () => {
      const s = await getApiClient().getSession();
      if (!cancelled) {
        setSession(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await getApiClient().signInWithEmail(email, password);
    if (res.ok) {
      setSession(res.data);
      return null;
    }
    return res.error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await getApiClient().signUpWithEmail(email, password);
    if (res.ok) {
      setSession(res.data);
      return null;
    }
    return res.error;
  }, []);

  const signOut = useCallback(async () => {
    await getApiClient().signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthStoreValue>(
    () => ({ enabled: isBackendConfigured, loading, session, signIn, signUp, signOut }),
    [loading, session, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthStoreValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
