// Auth types
export type { User, Session, Account, AuthContext, PublicUser } from './auth.js';

// Track types
export type { LikedTrack, NewLikedTrack, ScrapedTrack, ScrapeResults } from './track.js';

// Spotify types
export type {
  SpotifyTokenResponse,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyPlaylistTrack,
  SpotifySearchResponse,
  SpotifyPlaylistsResponse,
  SpotifyPlaylistTracksResponse,
} from './spotify.js';

// SSE types
export type { SSEEvent, SSEMessage, AzuracastNowPlaying } from './sse.js';

// API types
export type { ApiErrorResponse, ApiSuccessResponse, PaginatedResponse } from './api.js';

// Client types (shared between frontend and mobile)
export type {
  AuthResponse,
  PlatformLinks,
  PreferredPlatform,
  ClientLikedTrack,
  UserPreferences,
  LikeTrackRequest,
  CheckLikedRequest,
  CheckLikedResponse,
  ArtistInfo,
} from './client.js';
export { PLATFORM_NAMES } from './client.js';

// AzuraCast types
export type {
  Song,
  SongEntry,
  Mount,
  Station,
  Listeners,
  LiveStatus,
  NowPlaying,
} from './azuracast.js';

// Cast types
export type { CastConnectionState, CastMediaMetadata } from './cast.js';

// Stats types
export type { TrackEvent, MonthlyStats, StatsState } from './stats.js';

// Sleep timer types
export type { SleepTimerMode, SleepTimerState } from './sleep-timer.js';
