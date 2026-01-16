import { API_BASE_URL } from '../utils/config';

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

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
};

// ─────────────────────────────────────────────
// Preferences API
// ─────────────────────────────────────────────

export const preferencesApi = {
  // Récupérer les préférences
  getPreferences: (): Promise<UserPreferences> => fetchApi('/api/preferences'),

  // Mettre à jour les préférences
  updatePreferences: (preferredPlatform: PreferredPlatform): Promise<{ message: string; preferences: UserPreferences }> =>
    fetchApi('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferredPlatform }),
    }),
};
