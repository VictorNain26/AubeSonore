import { API_BASE_URL } from '../utils/config';
import { createTrackApi, createArtistApi, createPreferencesApi } from '@aubesonore/core/api';
import type { ApiClient } from '@aubesonore/core/api';
import type { AuthResponse } from '@aubesonore/shared-types/client';

// Re-export shared types so existing imports keep working
export type {
  ClientLikedTrack as LikedTrack,
  PlatformLinks,
  PreferredPlatform,
  UserPreferences,
  LikeTrackRequest,
  CheckLikedRequest,
  CheckLikedResponse,
  AuthResponse,
  ArtistInfo,
} from '@aubesonore/shared-types/client';

// Also re-export User/Session for consumers that import from here
export type { User, Session } from '@aubesonore/shared-types/client';

// ─────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────

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
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

const apiClient: ApiClient = { fetch: fetchApi };

// ─────────────────────────────────────────────
// Shared API endpoints (from @aubesonore/core)
// ─────────────────────────────────────────────

export const trackApi = createTrackApi(apiClient);
export const artistApi = createArtistApi(apiClient);
export const preferencesApi = createPreferencesApi(apiClient);

// ─────────────────────────────────────────────
// Push API (frontend-only)
// ─────────────────────────────────────────────

export const pushApi = {
  getVapidKey: (): Promise<{ key: string }> => fetchApi('/api/push/vapid-key'),

  subscribe: (subscription: PushSubscriptionJSON): Promise<{ message: string }> =>
    fetchApi('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),

  unsubscribe: (endpoint: string): Promise<{ message: string }> =>
    fetchApi('/api/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
};

// ─────────────────────────────────────────────
// Auth API (platform-specific — uses cookies)
// ─────────────────────────────────────────────

export const authApi = {
  getSession: async (): Promise<AuthResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json();
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
      const error = await response.json().catch(() => ({ message: 'Erreur inscription' }));
      throw new Error(error.message || 'Erreur inscription');
    }
    return response.json();
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur connexion' }));
      throw new Error(error.message || 'Erreur connexion');
    }
    return response.json();
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
