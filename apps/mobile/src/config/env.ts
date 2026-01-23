// Environment Configuration
// Ces valeurs seront lues depuis les variables d'environnement Expo en production

export const ENV = {
  // API Backend
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.aubesonore.fr',

  // AzuraCast Configuration
  AZURACAST_URL: process.env.EXPO_PUBLIC_AZURACAST_URL || 'https://radio.aubesonore.fr',
  STATION_SHORTCODE: process.env.EXPO_PUBLIC_STATION_SHORTCODE || 'aubesonore',
} as const;

// Derived URLs - Direct stream (MP3)
export const STREAM_URL = `${ENV.AZURACAST_URL}/listen/${ENV.STATION_SHORTCODE}/radio.mp3`;
export const SSE_URL = `${ENV.AZURACAST_URL}/api/live/nowplaying/sse`;
export const WEBSOCKET_URL = `wss://${ENV.AZURACAST_URL.replace(/^https?:\/\//, '')}/api/live/nowplaying/websocket`;
export const NOW_PLAYING_API_URL = `${ENV.AZURACAST_URL}/api/nowplaying/${ENV.STATION_SHORTCODE}`;

// Default album art
export const DEFAULT_ARTWORK = `${ENV.AZURACAST_URL}/static/uploads/album_art.1729543315.png`;
