/**
 * Spotify OAuth token response
 */
export interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  refresh_token?: string;
}

/**
 * Spotify playlist
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  external_urls: {
    spotify: string;
  };
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
  public: boolean;
  collaborative: boolean;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

/**
 * Spotify track
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{
    id: string;
    name: string;
    uri: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  popularity: number;
  explicit: boolean;
  preview_url: string | null;
}

/**
 * Spotify playlist track item
 */
export interface SpotifyPlaylistTrack {
  added_at: string;
  track: SpotifyTrack;
}

/**
 * Spotify search response
 */
export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

/**
 * Spotify playlists response
 */
export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

/**
 * Spotify playlist tracks response
 */
export interface SpotifyPlaylistTracksResponse {
  items: SpotifyPlaylistTrack[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}
