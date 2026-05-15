import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { authApi, type User } from '../lib/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export type { AuthContextType };

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ─────────────────────────────────────────────
// Provider-internal hook (owns the AuthState)
// ─────────────────────────────────────────────

/**
 * @internal Exported for unit tests only. App code must use {@link AuthProvider}
 * + {@link useAuth} instead — calling this directly bypasses the shared context.
 */
export function useAuthState(): AuthContextType {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    authError: null,
  });

  const refreshSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, authError: null }));
    try {
      const session = await authApi.getSession();
      setState({
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false,
        authError: null,
      });
    } catch (err) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: err instanceof Error ? err.message : 'Erreur réseau',
      });
    }
  }, []);

  useEffect(() => {
    // Mount-once init. refreshSession is stable (no deps) but listing it as a
    // dependency would still satisfy exhaustive-deps without affecting behavior.
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await refreshSession();
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.signIn(email, password);
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const response = await authApi.signUp(email, password, name);
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setState({ user: null, isAuthenticated: false, isLoading: false, authError: null });
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
