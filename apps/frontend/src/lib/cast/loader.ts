/**
 * Google Cast SDK Loader
 * Dynamically loads the Cast Web Sender SDK
 * Handles HMR gracefully by checking if SDK is already loaded
 */

// Type imports for Google Cast SDK (ambient types from google-cast.d.ts)

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
const CAST_SCRIPT_ID = 'google-cast-sdk';

let loadPromise: Promise<void> | null = null;

/**
 * Check if the Cast SDK is already available in the window
 * This handles HMR scenarios where the script is already loaded
 */
function isSDKAlreadyLoaded(): boolean {
  return !!(window.cast?.framework && window.chrome?.cast);
}

/**
 * Check if the script tag is already in the DOM
 */
function isScriptInDOM(): boolean {
  return !!document.getElementById(CAST_SCRIPT_ID);
}

/**
 * Load the Google Cast SDK
 * Returns a promise that resolves when the SDK is ready
 */
export function loadCastSDK(): Promise<void> {
  // SDK already available (handles HMR)
  if (isSDKAlreadyLoaded()) {
    return Promise.resolve();
  }

  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Script already in DOM but SDK not ready yet - wait for it
  if (isScriptInDOM()) {
    loadPromise = new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (isSDKAlreadyLoaded()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isSDKAlreadyLoaded()) {
          loadPromise = null;
          reject(new Error('Google Cast SDK load timeout'));
        }
      }, 10000);
    });
    return loadPromise;
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
        resolve();
      } else {
        loadPromise = null;
        reject(new Error('Google Cast SDK not available'));
      }
    };

    // Create and append script with ID to prevent duplicates
    const script = document.createElement('script');
    script.id = CAST_SCRIPT_ID;
    script.src = CAST_SDK_URL;
    script.async = true;

    script.onerror = () => {
      cleanup();
      loadPromise = null;
      reject(new Error('Failed to load Google Cast SDK'));
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!isSDKAlreadyLoaded()) {
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
  return isSDKAlreadyLoaded();
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
