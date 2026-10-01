// Client API types — shared between frontend and mobile
// These are the shapes returned by the API to clients (simpler than DB models in auth.ts)

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

export interface PlatformLinks {
  spotify?: string;
  appleMusic?: string;
  deezer?: string;
  youtubeMusic?: string;
  tidal?: string;
  amazonMusic?: string;
  soundcloud?: string;
}

// Canonical list of preferred platforms — single source of truth.
// Derive the `PreferredPlatform` type from this array so adding a platform
// only takes one edit (no chance of the type and validator drifting).
export const PREFERRED_PLATFORMS = [
  'spotify',
  'appleMusic',
  'deezer',
  'youtubeMusic',
  'tidal',
  'amazonMusic',
  'soundcloud',
  'youtube',
] as const;

export type PreferredPlatform = (typeof PREFERRED_PLATFORMS)[number];

export interface ClientLikedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
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
  track?: ClientLikedTrack;
}

export interface ArtistInfo {
  bio: string;
  tags: string[];
  similarArtists: string[];
  listeners: number;
}

export const PLATFORM_NAMES: Record<PreferredPlatform, string> = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  deezer: 'Deezer',
  youtubeMusic: 'YouTube Music',
  tidal: 'Tidal',
  amazonMusic: 'Amazon Music',
  soundcloud: 'SoundCloud',
  youtube: 'YouTube',
};

// Convenience: the same data shaped as a list for `<select>` / `<Picker>` UIs.
// Stable ordering matches PREFERRED_PLATFORMS.
export const PLATFORMS: ReadonlyArray<{ id: PreferredPlatform; name: string }> =
  PREFERRED_PLATFORMS.map((id) => ({ id, name: PLATFORM_NAMES[id] }));
