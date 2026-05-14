import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';
import { createTrackApi, createPreferencesApi } from '@aubesonore/core/api';
import type { ApiClient } from '@aubesonore/core/api';
import type { AuthResponse } from '../types';

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

async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

// ─────────────────────────────────────────────
// API Client with Retry Logic
// ─────────────────────────────────────────────

interface FetchApiOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  noRetry?: boolean;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(error: unknown, status?: number): boolean {
  if (error instanceof TypeError) return true;
  if (status && (status >= 500 || status === 429)) return true;
  return false;
}

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
// Shared API endpoints (from @aubesonore/core)
// ─────────────────────────────────────────────

const apiClient: ApiClient = { fetch: fetchApi };

export const trackApi = createTrackApi(apiClient);
export const preferencesApi = createPreferencesApi(apiClient);

// ─────────────────────────────────────────────
// Auth API (platform-specific — uses SecureStore tokens)
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
