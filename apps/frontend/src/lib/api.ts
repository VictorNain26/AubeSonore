import { API_BASE_URL } from '../utils/config';
import { createTrackApi, createPreferencesApi } from '@aubesonore/core/api';
import type { ApiClient } from '@aubesonore/core/api';
import type { AuthResponse } from '@aubesonore/shared-types/client';
import type { StatsState } from '@aubesonore/shared-types/stats';

export type {
  ClientLikedTrack as LikedTrack,
  PreferredPlatform,
  UserPreferences,
  LikeTrackRequest,
} from '@aubesonore/shared-types/client';

export type { User } from '@aubesonore/shared-types/client';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Erreur réseau' }))) as {
      error?: string;
    };
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const apiClient: ApiClient = { fetch: fetchApi };

export const trackApi = createTrackApi(apiClient);
export const preferencesApi = createPreferencesApi(apiClient);

export const authApi = {
  getSession: async (): Promise<AuthResponse | null> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) {
      throw new Error(`getSession failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as { user?: unknown };
    if (!data.user) return null;
    return data as AuthResponse;
  },

  signUp: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Erreur inscription' }))) as {
        message?: string;
      };
      throw new Error(error.message || 'Erreur inscription');
    }
    return response.json() as Promise<AuthResponse>;
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Erreur connexion' }))) as {
        message?: string;
      };
      throw new Error(error.message || 'Erreur connexion');
    }
    return response.json() as Promise<AuthResponse>;
  },

  signOut: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  forgetPassword: async (email: string): Promise<void> => {
    // Better Auth appends ?token=<TOKEN> (or ?error=INVALID_TOKEN) to redirectTo.
    // We point it to /reset-password so the SPA can detect the URL on landing
    // and open the reset modal automatically.
    const response = await fetch(`${API_BASE_URL}/api/auth/forget-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }),
    });
    if (!response.ok && response.status !== 404) {
      // 404 is returned when the email isn't registered — treat as success to
      // avoid email enumeration. Other errors bubble up.
      const error = (await response.json().catch(() => ({ message: 'Erreur réseau' }))) as {
        message?: string;
      };
      throw new Error(error.message || 'Erreur lors de la demande');
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({ message: 'Lien invalide ou expiré' }))) as {
        message?: string;
      };
      throw new Error(error.message || 'Erreur lors de la réinitialisation');
    }
  },

  // Better Auth's /sign-in/social is POST-only: POST {provider, callbackURL},
  // receive { url } (the provider authorize URL) and redirect the browser to it.
  signInWithProvider: async (provider: 'google'): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/social`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, callbackURL: window.location.origin }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Erreur connexion' }))) as {
        message?: string;
      };
      throw new Error(error.message || 'Connexion impossible');
    }
    const data = (await response.json()) as { url?: string };
    if (!data.url) throw new Error('URL de redirection manquante');
    window.location.href = data.url;
  },
};

export const statsApi = {
  getStats: () => fetchApi<StatsState | null>('/api/stats'),
  putStats: (snapshot: StatsState) =>
    fetchApi<void>('/api/stats', {
      method: 'PUT',
      body: JSON.stringify(snapshot),
    }),
};
