// ─────────────────────────────────────────────
// Shared AzuraCast helpers (frontend ↔ mobile)
// ─────────────────────────────────────────────

// Tokens that AzuraCast uses to name generic / fallback artwork. Anything URL
// containing one of these is treated as "no real cover" and should not be
// displayed as an ambient background, persisted on a like, etc.
const DEFAULT_ARTWORK_TOKENS = ['generic', 'default', 'placeholder'] as const;

export function isDefaultArtwork(url: string | null | undefined): boolean {
  if (!url) return true;
  return DEFAULT_ARTWORK_TOKENS.some((token) => url.includes(token));
}

// ─────────────────────────────────────────────
// URL builder
// ─────────────────────────────────────────────
// AzuraCast exposes the same endpoints on every install with a stable shape.
// Centralising the templates here keeps the shortcode swap testable and
// makes it impossible for one client to drift on a typo.

export interface AzuracastUrls {
  /** Live MP3 stream (Icecast frontend). */
  stream: string;
  /** Static now-playing JSON file (preferred for polling). */
  staticNowPlaying: string;
  /** Standard now-playing REST endpoint (PHP-FPM-backed; use as fallback). */
  restNowPlaying: string;
  /** Centrifugo SSE stream for real-time updates (rarely needed). */
  sse: string;
  /** Centrifugo WebSocket for real-time updates (rarely needed). */
  websocket: string;
}

export function buildAzuracastUrls(baseUrl: string, shortcode: string): AzuracastUrls {
  // Strip trailing slash so we never produce `//api/...`. Trust callers to
  // pass a valid origin — validation belongs at the env-parsing layer, not here.
  const base = baseUrl.replace(/\/$/, '');
  return {
    stream: `${base}/listen/${shortcode}/radio.mp3`,
    staticNowPlaying: `${base}/api/nowplaying_static/${shortcode}.json`,
    restNowPlaying: `${base}/api/nowplaying/${shortcode}`,
    sse: `${base}/api/live/nowplaying/sse`,
    websocket: `${base.replace(/^http/, 'ws')}/api/live/nowplaying/websocket`,
  };
}
