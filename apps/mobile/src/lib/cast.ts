/**
 * Google Cast module loader
 * Safely loads the native module once at startup
 */

type GoogleCastModule = {
  showCastDialog: () => void;
  getSessionManager: () => {
    onSessionStarting: (cb: () => void) => { remove: () => void };
    onSessionStarted: (cb: () => void) => { remove: () => void };
    onSessionEnded: (cb: () => void) => { remove: () => void };
    onSessionStartFailed: (cb: () => void) => { remove: () => void };
    endCurrentSession: (stopCasting: boolean) => Promise<void>;
  };
  getClient: () => Promise<{
    loadMedia: (options: {
      mediaInfo: {
        contentUrl: string;
        contentType: string;
        metadata: {
          type: string;
          title: string;
          artist: string;
          images: { url: string }[];
        };
      };
      autoplay: boolean;
    }) => Promise<void>;
  } | null>;
};

let googleCastModule: GoogleCastModule | null = null;
let loadAttempted = false;

/**
 * Get the Google Cast module if available
 * Returns null if native module is not installed
 */
export function getGoogleCast(): GoogleCastModule | null {
  if (loadAttempted) {
    return googleCastModule;
  }

  loadAttempted = true;

  try {
    const module = require('react-native-google-cast').default;
    if (module?.showCastDialog && module?.getSessionManager) {
      googleCastModule = module;
    }
  } catch {
    // Native module not available
  }

  return googleCastModule;
}

/**
 * Check if Google Cast is available
 */
export function isCastAvailable(): boolean {
  return getGoogleCast() !== null;
}

/**
 * Stop current cast session
 */
export async function stopCasting(): Promise<void> {
  const googleCast = getGoogleCast();
  if (!googleCast) return;

  try {
    await googleCast.getSessionManager().endCurrentSession(true);
  } catch {
    // Ignore errors when stopping
  }
}
