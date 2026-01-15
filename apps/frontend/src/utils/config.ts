export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';
export const AZURACAST_URL: string = import.meta.env.VITE_AZURACAST_BASE_URL || 'https://116.203.46.203';
export const SITE_BASE_URL: string = import.meta.env.VITE_SITE_BASE_URL || '';

// Stream URL - construit à partir de AZURACAST_URL + chemin du mount point
const STREAM_PATH = '/radio/8000/radio.mp3';
export const STREAM_URL: string = `${AZURACAST_URL}${STREAM_PATH}`;
