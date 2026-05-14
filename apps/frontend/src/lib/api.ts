import { API_BASE_URL } from '../utils/config';
import { createTrackApi, createPreferencesApi } from '@aubesonore/core/api';
import type { ApiClient } from '@aubesonore/core/api';
import type { AuthResponse } from '@aubesonore/shared-types/client';

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
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { user?: unknown };
      if (!data.user) return null;
      return data as AuthResponse;
    } catch {
      return null;
    }
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

  getGoogleAuthUrl: (): string => `${API_BASE_URL}/api/auth/sign-in/social?provider=google`,
};
