/**
 * Google Cast SDK Loader
 * Dynamically loads the Cast Web Sender SDK
 */

// Type imports for Google Cast SDK (ambient types from google-cast.d.ts)

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Load the Google Cast SDK
 * Returns a promise that resolves when the SDK is ready
 */
export function loadCastSDK(): Promise<void> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Already loaded
  if (isLoaded && window.cast && window.chrome?.cast) {
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Set up callback before loading script
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      cleanup();
      if (isAvailable) {
        isLoaded = true;
        resolve();
      } else {
        loadPromise = null;
        reject(new Error('Google Cast SDK not available'));
      }
    };

    // Create and append script
    const script = document.createElement('script');
    script.src = CAST_SDK_URL;
    script.async = true;

    script.onerror = () => {
      cleanup();
      loadPromise = null;
      reject(new Error('Failed to load Google Cast SDK'));
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds - reject if SDK hasn't loaded
    timeoutId = setTimeout(() => {
      if (!isLoaded) {
        loadPromise = null;
        reject(new Error('Google Cast SDK load timeout'));
      }
    }, 10000);
  });

  return loadPromise;
}

/**
 * Check if the Cast SDK is loaded
 */
export function isCastSDKLoaded(): boolean {
  return isLoaded && !!window.cast && !!window.chrome?.cast;
}

/**
 * Get the Cast framework
 */
export function getCastFramework(): typeof cast.framework | null {
  if (!isCastSDKLoaded()) return null;
  return window.cast?.framework ?? null;
}

/**
 * Get the Cast context
 */
export function getCastContext(): cast.framework.CastContext | null {
  const framework = getCastFramework();
  if (!framework) return null;
  return framework.CastContext.getInstance();
}
