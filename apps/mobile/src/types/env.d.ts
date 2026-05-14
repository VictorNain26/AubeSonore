// Type augmentation for Expo public env vars. Without this, process.env
// is typed `Record<string, string | undefined>` in some configurations
// and `any` in others — typed ESLint rules then flag every read as
// no-unsafe-assignment / no-unsafe-call.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL?: string;
    readonly EXPO_PUBLIC_AZURACAST_URL?: string;
    readonly EXPO_PUBLIC_STATION_SHORTCODE?: string;
  }
}
