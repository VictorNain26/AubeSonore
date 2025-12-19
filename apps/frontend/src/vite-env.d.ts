/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AZURACAST_BASE_URL: string;
  readonly VITE_SITE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
