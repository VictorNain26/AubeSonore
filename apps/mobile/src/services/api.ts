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
// API Client with Retry Logic
// ─────────────────────────────────────────────

interface FetchApiOptions extends RequestInit {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  retryDelay?: number;
  /** Skip retry for this request */
  noRetry?: boolean;
}

/** Delay helper for exponential backoff */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Check if error is retryable (network errors, 5xx, 429) */
function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors (fetch throws on network failure)
  if (error instanceof TypeError) return true;

  // Server errors and rate limiting
  if (status && (status >= 500 || status === 429)) return true;

  return false;
}

/** Map HTTP status to user-friendly messages */
function getErrorMessage(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;

  switch (status) {
    case 400:
      return 'Requête invalide';
    case 401:
      return 'Non autorisé - veuillez vous reconnecter';
    case 403:
      return 'Accès refusé';
    case 404:
      return 'Ressource non trouvée';
    case 429:
      return 'Trop de requêtes - veuillez patienter';
    case 500:
      return 'Erreur serveur - réessayez plus tard';
    case 502:
    case 503:
    case 504:
      return 'Service temporairement indisponible';
    default:
      return `Erreur HTTP ${status}`;
  }
}

async function fetchApi<T>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  const { retries = 3, retryDelay = 1000, noRetry = false, ...fetchOptions } = options;

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Cookie'] = `better_auth.session_token=${token}`;
  }

  let lastError: Error | null = null;
  let attempts = 0;
  const maxAttempts = noRetry ? 1 : retries;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = getErrorMessage(response.status, errorBody.error || errorBody.message);

        // Check if we should retry
        if (isRetryableError(null, response.status) && attempts < maxAttempts - 1) {
          attempts++;
          const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
          await delay(backoffDelay);
          continue;
        }

        throw new Error(message);
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erreur inconnue');

      // Check if we should retry (network errors)
      if (isRetryableError(error) && attempts < maxAttempts - 1) {
        attempts++;
        const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
        await delay(backoffDelay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Erreur réseau');
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
          Origin: ENV.API_BASE_URL,
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
      headers: {
        'Content-Type': 'application/json',
        Origin: ENV.API_BASE_URL,
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inscription' }));
      throw new Error(error.message || 'Erreur inscription');
    }

    const data = await response.json();

    // Extract token from response body (better-auth returns it in session.token)
    // This is more reliable than Set-Cookie which doesn't work in React Native
    const token = data.session?.token || data.token;
    if (token) {
      await setAuthToken(token);
    }

    return data;
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${ENV.API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ENV.API_BASE_URL,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur connexion' }));
      throw new Error(error.message || 'Erreur connexion');
    }

    const data = await response.json();

    // Extract token from response body (better-auth returns it in session.token)
    // This is more reliable than Set-Cookie which doesn't work in React Native
    const token = data.session?.token || data.token;
    if (token) {
      await setAuthToken(token);
    }

    return data;
  },

  signOut: async (): Promise<void> => {
    const token = await getAuthToken();
    if (token) {
      await fetch(`${ENV.API_BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: ENV.API_BASE_URL,
          Cookie: `better_auth.session_token=${token}`,
        },
      });
    }
    await removeAuthToken();
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await fetch(`${ENV.API_BASE_URL}/api/auth/forget-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ENV.API_BASE_URL,
      },
      body: JSON.stringify({ email, redirectTo: `${ENV.API_BASE_URL}/reset-password` }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur' }));
      throw new Error(error.message || 'Une erreur est survenue');
    }
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
