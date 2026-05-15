// Environment Configuration
// Ces valeurs seront lues depuis les variables d'environnement Expo en production

import { buildAzuracastUrls } from '@aubesonore/core/azuracast';

export const ENV = {
  // API Backend
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.aubesonore.fr',

  // AzuraCast Configuration
  AZURACAST_URL: process.env.EXPO_PUBLIC_AZURACAST_URL || 'https://radio.aubesonore.fr',
  STATION_SHORTCODE: process.env.EXPO_PUBLIC_STATION_SHORTCODE || 'aubesonore',
} as const;

// Derived URLs — single source of truth shared with the web client.
const azuracastUrls = buildAzuracastUrls(ENV.AZURACAST_URL, ENV.STATION_SHORTCODE);
export const STREAM_URL = azuracastUrls.stream;
export const SSE_URL = azuracastUrls.sse;
export const WEBSOCKET_URL = azuracastUrls.websocket;
export const NOW_PLAYING_API_URL = azuracastUrls.restNowPlaying;

// Default album art (specific to this AzuraCast install, not shared).
export const DEFAULT_ARTWORK = `${ENV.AZURACAST_URL}/static/uploads/album_art.1729543315.png`;
