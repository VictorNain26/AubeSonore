import { API_BASE_URL } from '../utils/config';

// ─────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PlatformLinks {
  spotify?: string;
  appleMusic?: string;
  deezer?: string;
  youtubeMusic?: string;
  tidal?: string;
  amazonMusic?: string;
  soundcloud?: string;
}

export type PreferredPlatform =
  | 'spotify'
  | 'appleMusic'
  | 'deezer'
  | 'youtubeMusic'
  | 'tidal'
  | 'amazonMusic'
  | 'soundcloud'
  | 'youtube';

export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  artworkBase64?: string | null;
  youtubeUrl: string;
  isrc?: string | null;
  songlinkUrl?: string | null;
  platformLinks?: PlatformLinks | null;
  createdAt: string;
  userId: string;
}

export interface UserPreferences {
  userId: string;
  preferredPlatform: PreferredPlatform;
  updatedAt: string;
}

export interface LikeTrackRequest {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  youtubeUrl: string;
  isrc?: string;
}

export interface CheckLikedRequest {
  title: string;
  artist: string;
}

export interface CheckLikedResponse {
  liked: boolean;
  track?: LikedTrack;
}

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

// ─────────────────────────────────────────────
// Track API
// ─────────────────────────────────────────────

export const trackApi = {
  // Récupérer les morceaux likés
  getLikedTracks: (): Promise<LikedTrack[]> => fetchApi('/api/track/like'),

  // Liker un morceau
  likeTrack: (data: LikeTrackRequest): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi('/api/track/like', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Supprimer un like
  unlikeTrack: (trackId: string): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi(`/api/track/like/${trackId}`, {
      method: 'DELETE',
    }),

  // Vérifier si un morceau est liké
  checkLiked: (data: CheckLikedRequest): Promise<CheckLikedResponse> =>
    fetchApi('/api/track/check-liked', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Rafraîchir les liens Songlink
  refreshLinks: (trackId: string): Promise<{ message: string; track: LikedTrack }> =>
    fetchApi(`/api/track/${trackId}/refresh-links`, {
      method: 'POST',
    }),

  // Rafraîchir tous les liens
  refreshAllLinks: (): Promise<{ message: string; updated: number }> =>
    fetchApi('/api/track/refresh-all-links', {
      method: 'POST',
    }),
};

// ─────────────────────────────────────────────
// Artist API
// ─────────────────────────────────────────────

export interface ArtistInfo {
  bio: string;
  tags: string[];
  similarArtists: string[];
  listeners: number;
}

export const artistApi = {
  getInfo: (name: string): Promise<ArtistInfo> =>
    fetchApi(`/api/artist?name=${encodeURIComponent(name)}`),
};

// ─────────────────────────────────────────────
// Preferences API
// ─────────────────────────────────────────────

export const preferencesApi = {
  // Récupérer les préférences
  getPreferences: (): Promise<UserPreferences> => fetchApi('/api/preferences'),

  // Mettre à jour les préférences
  updatePreferences: (
    preferredPlatform: PreferredPlatform
  ): Promise<{ message: string; preferences: UserPreferences }> =>
    fetchApi('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferredPlatform }),
    }),
};

// ─────────────────────────────────────────────
// Push API
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
// Auth API
// ─────────────────────────────────────────────

export const authApi = {
  // Récupérer la session courante
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

  // Inscription
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

  // Connexion
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

  // Déconnexion
  signOut: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Connexion Google
  getGoogleAuthUrl: (): string => `${API_BASE_URL}/api/auth/sign-in/social?provider=google`,
};
