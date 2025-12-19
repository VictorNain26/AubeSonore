import { useEffect } from 'react';
import { authClient } from '../lib/authClient';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  [key: string]: unknown;
}

export interface Session {
  user: User;
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AuthError {
  message?: string;
  status?: number;
  [key: string]: unknown;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  signIn: typeof authClient.signIn;
  signUp: typeof authClient.signUp;
  signOut: () => Promise<void>;
  sendVerificationEmail: typeof authClient.sendVerificationEmail;
  resetPassword: typeof authClient.resetPassword;
  refetch: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const {
    data: session,
    isPending,
    error,
    refetch,
  } = authClient.useSession();

  const user = (session as Session)?.user || null;
  const isAuthenticated = !!user;

  // 🔁 Refresh automatique avant expiration du token
  useEffect(() => {
    if (!session?.session.expiresAt || !isAuthenticated) {
      return;
    }

    const expiresAt = new Date(session.session.expiresAt).getTime();
    const now = Date.now();
    const refreshIn = Math.max(expiresAt - now - 60 * 1000, 10 * 1000);

    const timer = setTimeout(() => {
      refetch();
    }, refreshIn);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[useAuth] Prochain refresh dans ${Math.round(refreshIn / 1000)}s`);
    }

    return (): void => clearTimeout(timer);
  }, [session?.session.expiresAt, isAuthenticated, refetch]);

  // 🔁 Refresh quand l'onglet revient en focus ou que l'utilisateur est de retour en ligne
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    const handleOnline = (): void => {
      refetch();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return (): void => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refetch]);

  return {
    user,
    isAuthenticated,
    isLoading: isPending,
    error: error as AuthError | null,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: async (): Promise<void> => {
      try {
        authClient.signOut();
        refetch();
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error('[useAuth → signOut]', err);
      }
    },
    sendVerificationEmail: authClient.sendVerificationEmail,
    resetPassword: authClient.resetPassword,
    refetch,
  };
};
