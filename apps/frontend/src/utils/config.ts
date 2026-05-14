// API Backend
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '';

// AzuraCast Configuration
export const AZURACAST_URL: string =
  import.meta.env.VITE_AZURACAST_BASE_URL || 'https://116.203.46.203';
export const STATION_SHORTCODE: string = import.meta.env.VITE_STATION_SHORTCODE || 'aubesonore';

// URLs construites
export const STREAM_URL: string = `${AZURACAST_URL}/listen/${STATION_SHORTCODE}/radio.mp3`;
export const SSE_URL: string = `${AZURACAST_URL}/api/live/nowplaying/sse`;
export const STATIC_NOWPLAYING_URL: string = `${AZURACAST_URL}/api/nowplaying_static/${STATION_SHORTCODE}.json`;
