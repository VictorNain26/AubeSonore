/**
 * Cast Store - Zustand state management for casting
 *
 * HMR-Safe Implementation (Best Practice 2025):
 * - Uses window to persist cleanup functions across HMR
 * - Zustand store naturally persists through HMR
 */

import { create } from 'zustand';
import {
  initializeChromecast,
  isChromecastAvailable,
  getChromecastDeviceName,
  requestChromecastSession,
  loadChromecastMedia,
  endChromecastSession,
  onCastStateChanged,
  onSessionStateChanged,
  isAirPlayAvailable,
} from '../lib/cast';
import type { CastType, CastMediaMetadata } from '../types/cast';

// HMR-safe cleanup function storage
const CLEANUP_KEY = '__CAST_STORE_CLEANUP__';

interface CastCleanupFunctions {
  castState: (() => void) | null;
  sessionState: (() => void) | null;
}

declare global {
  interface Window {
    [CLEANUP_KEY]?: CastCleanupFunctions;
  }
}

// Get or create cleanup storage
function getCleanupStorage(): CastCleanupFunctions {
  if (!window[CLEANUP_KEY]) {
    window[CLEANUP_KEY] = { castState: null, sessionState: null };
  }
  return window[CLEANUP_KEY];
}

interface CastStoreState {
  // Availability
  chromecastAvailable: boolean;
  airplayAvailable: boolean;

  // Connection state
  isCasting: boolean;
  castType: CastType | null;
  deviceName: string | null;

  // UI state
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface CastStoreActions {
  // Initialization
  initialize: () => Promise<void>;

  // Chromecast
  startChromecast: () => Promise<void>;
  updateNowPlaying: (metadata: CastMediaMetadata) => Promise<void>;

  // AirPlay (handled via audio element)
  setAirPlayConnected: (connected: boolean) => void;

  // General
  stopCasting: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type CastStore = CastStoreState & CastStoreActions;

export const useCastStore = create<CastStore>((set, get) => ({
  // Initial state
  chromecastAvailable: false,
  airplayAvailable: isAirPlayAvailable(),
  isCasting: false,
  castType: null,
  deviceName: null,
  isConnecting: false,
  isInitialized: false,
  error: null,

  // Initialize cast SDK and listeners
  initialize: async () => {
    if (get().isInitialized) return;

    try {
      await initializeChromecast();

      // Get HMR-safe cleanup storage
      const cleanup = getCleanupStorage();

      // Clean up existing listeners if any (prevent duplicates on hot reload)
      if (cleanup.castState) {
        cleanup.castState();
        cleanup.castState = null;
      }
      if (cleanup.sessionState) {
        cleanup.sessionState();
        cleanup.sessionState = null;
      }

      // Set up cast state listener
      cleanup.castState = onCastStateChanged((state) => {
        const available = state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
        set({ chromecastAvailable: available });
      });

      // Set up session state listener
      cleanup.sessionState = onSessionStateChanged((state) => {
        if (state === cast.framework.SessionState.SESSION_STARTED) {
          const deviceName = getChromecastDeviceName();
          set({
            isCasting: true,
            castType: 'chromecast',
            deviceName,
            isConnecting: false,
            error: null,
          });
        } else if (
          state === cast.framework.SessionState.SESSION_ENDED ||
          state === cast.framework.SessionState.SESSION_START_FAILED
        ) {
          // Only reset if we were casting via Chromecast
          if (get().castType === 'chromecast') {
            set({
              isCasting: false,
              castType: null,
              deviceName: null,
              isConnecting: false,
            });
          }
        } else if (state === cast.framework.SessionState.SESSION_STARTING) {
          set({ isConnecting: true });
        }
      });

      // Check initial availability
      set({
        chromecastAvailable: isChromecastAvailable(),
        isInitialized: true,
      });
    } catch (error) {
      console.warn('[CastStore] Failed to initialize:', error);
      set({ isInitialized: true }); // Mark as initialized even on failure
    }
  },

  // Start Chromecast session
  startChromecast: async () => {
    try {
      set({ isConnecting: true, error: null });
      await requestChromecastSession();
    } catch (error) {
      console.error('[CastStore] Failed to start Chromecast:', error);
      set({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      });
    }
  },

  // Update now playing on cast device
  updateNowPlaying: async (metadata: CastMediaMetadata) => {
    const { isCasting, castType } = get();

    if (!isCasting || castType !== 'chromecast') return;

    try {
      await loadChromecastMedia(metadata);
    } catch (error) {
      console.error('[CastStore] Failed to update now playing:', error);
    }
  },

  // Set AirPlay connection state
  setAirPlayConnected: (connected: boolean) => {
    if (connected) {
      set({
        isCasting: true,
        castType: 'airplay',
        deviceName: 'AirPlay',
        isConnecting: false,
        error: null,
      });
    } else {
      // Only reset if currently casting via AirPlay
      if (get().castType === 'airplay') {
        set({
          isCasting: false,
          castType: null,
          deviceName: null,
        });
      }
    }
  },

  // Stop casting
  stopCasting: () => {
    const { castType } = get();

    if (castType === 'chromecast') {
      endChromecastSession();
    }
    // AirPlay is controlled via the system picker

    set({
      isCasting: false,
      castType: null,
      deviceName: null,
      isConnecting: false,
    });
  },

  // Set error
  setError: (error: string | null) => {
    set({ error });
  },

  // Reset state
  reset: () => {
    set({
      isCasting: false,
      castType: null,
      deviceName: null,
      isConnecting: false,
      error: null,
    });
  },
}));

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
}
