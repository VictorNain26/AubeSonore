/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AZURACAST_BASE_URL: string;
  readonly VITE_STATION_SHORTCODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
