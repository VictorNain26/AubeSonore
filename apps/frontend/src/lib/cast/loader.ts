/**
 * Google Cast SDK Loader
 * Dynamically loads the Cast Web Sender SDK
 *
 * HMR-Safe Implementation (Best Practice 2025):
 * - Uses customElements.get() as definitive SDK load check
 * - Persists load promise on window to survive HMR
 * - Proper cleanup with import.meta.hot
 */

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
const CAST_SCRIPT_ID = 'google-cast-sdk';
const LOAD_PROMISE_KEY = '__CAST_SDK_LOAD_PROMISE__';

// Extend window type for our HMR-safe global
declare global {
  interface Window {
    [LOAD_PROMISE_KEY]?: Promise<void>;
  }
}

/**
 * Check if the Cast SDK custom element is registered
 * This is the most reliable indicator that SDK is fully loaded
 * Custom elements persist across HMR
 */
function isCustomElementRegistered(): boolean {
  return customElements.get('google-cast-button') !== undefined;
}

/**
 * Check if the Cast SDK APIs are available in the window
 */
function isSDKApiAvailable(): boolean {
  return !!(window.cast?.framework && window.chrome?.cast);
}

/**
 * Check if the script tag is already in the DOM
 */
function isScriptInDOM(): boolean {
  return !!document.getElementById(CAST_SCRIPT_ID);
}

/**
 * Wait for SDK to be fully ready (APIs available)
 */
function waitForSDKReady(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isSDKApiAvailable()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isSDKApiAvailable()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Google Cast SDK load timeout'));
      }
    }, 50);
  });
}

/**
 * Load the Google Cast SDK
 * Returns a promise that resolves when the SDK is ready
 *
 * HMR-Safe: Uses customElements check and window-persisted promise
 */
export function loadCastSDK(): Promise<void> {
  // Check if custom element is already registered (strongest HMR indicator)
  // This means SDK was fully loaded in a previous module version
  if (isCustomElementRegistered()) {
    // SDK loaded, just wait for APIs to be available
    return waitForSDKReady();
  }

  // Check for existing load promise (persisted on window for HMR)
  if (window[LOAD_PROMISE_KEY]) {
    return window[LOAD_PROMISE_KEY];
  }

  // Script in DOM but loading - wait for it
  if (isScriptInDOM()) {
    window[LOAD_PROMISE_KEY] = waitForSDKReady();
    return window[LOAD_PROMISE_KEY];
  }

  // Create new load promise and persist on window
  window[LOAD_PROMISE_KEY] = new Promise((resolve, reject) => {
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
        delete window[LOAD_PROMISE_KEY];
        reject(new Error('Google Cast SDK not available'));
      }
    };

    // Create and append script
    const script = document.createElement('script');
    script.id = CAST_SCRIPT_ID;
    script.src = CAST_SDK_URL;
    script.async = true;

    script.onerror = () => {
      cleanup();
      delete window[LOAD_PROMISE_KEY];
      reject(new Error('Failed to load Google Cast SDK'));
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!isSDKApiAvailable()) {
        delete window[LOAD_PROMISE_KEY];
        reject(new Error('Google Cast SDK load timeout'));
      }
    }, 10000);
  });

  return window[LOAD_PROMISE_KEY];
}

// HMR support - accept updates without full reload
if (import.meta.hot) {
  import.meta.hot.accept();
}

/**
 * Check if the Cast SDK is loaded
 */
export function isCastSDKLoaded(): boolean {
  return isSDKApiAvailable();
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
