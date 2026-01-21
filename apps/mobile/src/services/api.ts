import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';
import type {
  AuthResponse,
  LikedTrack,
  LikeTrackRequest,
  CheckLikedRequest,
  CheckLikedResponse,
  UserPreferences,
  PreferredPlatform,
} from '../types';

// Storage keys
const AUTH_TOKEN_KEY = 'auth_session_token';

// ─────────────────────────────────────────────
// Token Management
// ─────────────────────────────────────────────

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

// ─────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Cookie'] = `better_auth.session_token=${token}`;
  }

  const response = await fetch(`${ENV.API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────

export const authApi = {
  getSession: async (): Promise<AuthResponse | null> => {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      const response = await fetch(`${ENV.API_BASE_URL}/api/auth/get-session`, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better_auth.session_token=${token}`,
        },
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
    const response = await fetch(`${ENV.API_BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inscription' }));
      throw new Error(error.message || 'Erreur inscription');
    }

    // Extract session token from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const tokenMatch = setCookie.match(/better_auth\.session_token=([^;]+)/);
      if (tokenMatch?.[1]) {
        await setAuthToken(tokenMatch[1]);
      }
    }

    return response.json();
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${ENV.API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur connexion' }));
      throw new Error(error.message || 'Erreur connexion');
    }

    // Extract session token from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const tokenMatch = setCookie.match(/better_auth\.session_token=([^;]+)/);
      if (tokenMatch?.[1]) {
        await setAuthToken(tokenMatch[1]);
      }
    }

    return response.json();
  },

  signOut: async (): Promise<void> => {
    const token = await getAuthToken();
    if (token) {
      await fetch(`${ENV.API_BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better_auth.session_token=${token}`,
        },
      });
    }
    await removeAuthToken();
  },

  getGoogleAuthUrl: (): string => `${ENV.API_BASE_URL}/api/auth/sign-in/social?provider=google`,

  getSpotifyAuthUrl: (): string => `${ENV.API_BASE_URL}/api/auth/sign-in/social?provider=spotify`,
};

// ─────────────────────────────────────────────
// Track API
// ─────────────────────────────────────────────

export const trackApi = {
  getLikedTracks: (): Promise<LikedTrack[]> => fetchApi('/api/track/like'),

  likeTrack: (data: LikeTrackRequest): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi('/api/track/like', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unlikeTrack: (trackId: string): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi(`/api/track/like/${trackId}`, {
      method: 'DELETE',
    }),

  checkLiked: (data: CheckLikedRequest): Promise<CheckLikedResponse> =>
    fetchApi('/api/track/check-liked', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshLinks: (trackId: string): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi(`/api/track/${trackId}/refresh-links`, {
      method: 'POST',
    }),
};

// ─────────────────────────────────────────────
// Preferences API
// ─────────────────────────────────────────────

export const preferencesApi = {
  getPreferences: (): Promise<UserPreferences> => fetchApi('/api/preferences'),

  updatePreferences: (
    preferredPlatform: PreferredPlatform
  ): Promise<{ message: string; preferences: UserPreferences }> =>
    fetchApi('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferredPlatform }),
    }),
};
