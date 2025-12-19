// Auth types
export type {
  User,
  Session,
  Account,
  AuthContext,
  PublicUser,
} from './auth.js';

// Track types
export type {
  LikedTrack,
  NewLikedTrack,
  ScrapedTrack,
  ScrapeResults,
} from './track.js';

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
export type {
  SSEEvent,
  SSEMessage,
  AzuracastNowPlaying,
} from './sse.js';

// API types
export type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedResponse,
} from './api.js';
