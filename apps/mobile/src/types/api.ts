// Re-export shared client types
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
export type { User, Session } from '@aubesonore/shared-types/client';
export { PLATFORM_NAMES } from '@aubesonore/shared-types/client';

// Platform icons — mobile-specific (Ionicons names)
import type { PreferredPlatform } from '@aubesonore/shared-types/client';

export const PLATFORM_ICONS: Record<PreferredPlatform, string> = {
  spotify: 'logo-spotify',
  appleMusic: 'musical-notes',
  deezer: 'musical-notes',
  youtubeMusic: 'logo-youtube',
  tidal: 'water',
  amazonMusic: 'logo-amazon',
  soundcloud: 'cloud',
  youtube: 'logo-youtube',
};
