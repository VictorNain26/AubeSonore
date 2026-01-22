/**
 * Google Cast SDK Loader
 *
 * Based on official documentation:
 * https://developers.google.com/cast/docs/web_sender/integrate
 *
 * Key points:
 * - Set window.__onGCastApiAvailable BEFORE loading script
 * - Use loadCastFramework=1 query parameter
 * - SDK updates automatically for all users
 */

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

// Singleton state persisted on window for HMR safety
const STATE_KEY = '__CAST_SDK_STATE__';

interface CastSDKState {
  loadPromise: Promise<void> | null;
  isLoaded: boolean;
}

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    [STATE_KEY]?: CastSDKState;
  }
}

function getState(): CastSDKState {
  if (!window[STATE_KEY]) {
    window[STATE_KEY] = { loadPromise: null, isLoaded: false };
  }
  return window[STATE_KEY];
}

/**
 * Check if Cast SDK is fully loaded and ready
 */
export function isCastSDKLoaded(): boolean {
  return !!(window.cast?.framework && window.chrome?.cast);
}

/**
 * Load the Google Cast SDK
 * Returns a promise that resolves when SDK is ready
 */
export function loadCastSDK(): Promise<void> {
  const state = getState();

  // Already loaded
  if (state.isLoaded || isCastSDKLoaded()) {
    state.isLoaded = true;
    return Promise.resolve();
  }

  // Already loading
  if (state.loadPromise) {
    return state.loadPromise;
  }

  state.loadPromise = new Promise((resolve, reject) => {
    // Set callback BEFORE loading script (per documentation)
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        state.isLoaded = true;
        resolve();
      } else {
        state.loadPromise = null;
        reject(new Error('Google Cast SDK not available'));
      }
    };

    // Check if script already exists (HMR scenario)
    const existingScript = document.querySelector(
      `script[src^="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"]`
    );

    if (existingScript) {
      // Script exists, wait for callback or check if already loaded
      if (isCastSDKLoaded()) {
        state.isLoaded = true;
        resolve();
        return;
      }
      // Wait for the callback to fire
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = CAST_SDK_URL;
    script.async = true;

    script.onerror = () => {
      state.loadPromise = null;
      reject(new Error('Failed to load Google Cast SDK'));
    };

    document.head.appendChild(script);

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!state.isLoaded) {
        state.loadPromise = null;
        reject(new Error('Google Cast SDK load timeout'));
      }
    }, 15000);
  });

  return state.loadPromise;
}

/**
 * Get the Cast context singleton
 */
export function getCastContext(): cast.framework.CastContext | null {
  if (!isCastSDKLoaded()) return null;
  return cast.framework.CastContext.getInstance();
}

/**
 * Get current cast session
 */
export function getCurrentSession(): cast.framework.CastSession | null {
  return getCastContext()?.getCurrentSession() ?? null;
}
