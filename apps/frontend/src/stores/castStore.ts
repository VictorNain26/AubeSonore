/**
 * Cast Store - Zustand state management for Chromecast and AirPlay
 *
 * Integrates:
 * - Google Cast SDK (via RemotePlayerController events)
 * - Safari AirPlay (via WebKit events)
 * - Local player coordination
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
  isAirPlaySupported,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
  showAirPlayPicker,
} from '../lib/cast';
import { getAudioElement } from '../lib/player';
import type { CastType, CastMediaMetadata } from '../types/cast';

// Singleton cleanup storage on window for HMR safety
const CLEANUP_KEY = '__CAST_STORE_CLEANUP__';

interface CleanupFunctions {
  castState: (() => void) | null;
  sessionState: (() => void) | null;
  airplayAvailability: (() => void) | null;
  airplayConnection: (() => void) | null;
}

declare global {
  interface Window {
    [CLEANUP_KEY]?: CleanupFunctions;
  }
}

function getCleanups(): CleanupFunctions {
  if (!window[CLEANUP_KEY]) {
    window[CLEANUP_KEY] = {
      castState: null,
      sessionState: null,
      airplayAvailability: null,
      airplayConnection: null,
    };
  }
  return window[CLEANUP_KEY];
}

function cleanupAll(): void {
  const cleanups = getCleanups();
  Object.values(cleanups).forEach((fn) => fn?.());
  window[CLEANUP_KEY] = {
    castState: null,
    sessionState: null,
    airplayAvailability: null,
    airplayConnection: null,
  };
}

// Store types
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
  initialize: () => Promise<void>;
  startChromecast: () => Promise<void>;
  startAirPlay: () => void;
  updateNowPlaying: (metadata: CastMediaMetadata) => Promise<void>;
  stopCasting: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type CastStore = CastStoreState & CastStoreActions;

export const useCastStore = create<CastStore>((set, get) => ({
  // Initial state
  chromecastAvailable: false,
  airplayAvailable: isAirPlaySupported(),
  isCasting: false,
  castType: null,
  deviceName: null,
  isConnecting: false,
  isInitialized: false,
  error: null,

  /**
   * Initialize casting capabilities
   * Sets up Chromecast SDK and AirPlay listeners
   */
  initialize: async () => {
    if (get().isInitialized) return;

    // Clean up any existing listeners
    cleanupAll();
    const cleanups = getCleanups();

    try {
      // Initialize Chromecast
      const chromecastReady = await initializeChromecast();

      if (chromecastReady) {
        // Listen to cast state changes (device availability)
        cleanups.castState = onCastStateChanged((state) => {
          const available = state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
          set({ chromecastAvailable: available });
        });

        // Listen to session state changes
        cleanups.sessionState = onSessionStateChanged((state) => {
          switch (state) {
            case cast.framework.SessionState.SESSION_STARTING:
              set({ isConnecting: true });
              break;

            case cast.framework.SessionState.SESSION_STARTED:
            case cast.framework.SessionState.SESSION_RESUMED: {
              const deviceName = getChromecastDeviceName();
              set({
                isCasting: true,
                castType: 'chromecast',
                deviceName,
                isConnecting: false,
                error: null,
              });
              break;
            }

            case cast.framework.SessionState.SESSION_ENDED:
            case cast.framework.SessionState.SESSION_START_FAILED:
              // Only reset if was casting via Chromecast
              if (get().castType === 'chromecast') {
                set({
                  isCasting: false,
                  castType: null,
                  deviceName: null,
                  isConnecting: false,
                });
              }
              break;
          }
        });

        // Set initial Chromecast availability
        set({ chromecastAvailable: isChromecastAvailable() });
      }

      // Initialize AirPlay listeners (Safari only)
      if (isAirPlaySupported()) {
        const audio = getAudioElement();

        // Listen to AirPlay availability
        cleanups.airplayAvailability = onAirPlayAvailabilityChanged(audio, (available) => {
          set({ airplayAvailable: available });
        });

        // Listen to AirPlay connection changes
        cleanups.airplayConnection = onAirPlayConnectionChanged(audio, (isWireless) => {
          if (isWireless) {
            set({
              isCasting: true,
              castType: 'airplay',
              deviceName: 'AirPlay',
              isConnecting: false,
              error: null,
            });
          } else if (get().castType === 'airplay') {
            set({
              isCasting: false,
              castType: null,
              deviceName: null,
            });
          }
        });
      }

      set({ isInitialized: true });
    } catch (error) {
      console.warn('[CastStore] Initialization error:', error);
      set({ isInitialized: true });
    }
  },

  /**
   * Start Chromecast session (opens device picker)
   */
  startChromecast: async () => {
    try {
      set({ isConnecting: true, error: null });
      await requestChromecastSession();
      // Session state listener will update the rest
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect';
      // User cancelled is not an error
      if (!message.includes('cancel')) {
        console.error('[CastStore] Chromecast error:', error);
        set({ error: message });
      }
      set({ isConnecting: false });
    }
  },

  /**
   * Start AirPlay (opens native device picker)
   */
  startAirPlay: () => {
    const audio = getAudioElement();
    showAirPlayPicker(audio);
    // AirPlay connection listener will update the rest
  },

  /**
   * Update now playing metadata on cast device
   */
  updateNowPlaying: async (metadata: CastMediaMetadata) => {
    const { isCasting, castType } = get();

    if (!isCasting || castType !== 'chromecast') return;

    try {
      await loadChromecastMedia(metadata);
    } catch (error) {
      console.error('[CastStore] Failed to update now playing:', error);
    }
  },

  /**
   * Stop current casting session
   */
  stopCasting: () => {
    const { castType } = get();

    if (castType === 'chromecast') {
      endChromecastSession();
    }
    // AirPlay: user must disconnect via system picker

    set({
      isCasting: false,
      castType: null,
      deviceName: null,
      isConnecting: false,
    });
  },

  /**
   * Set error message
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Reset store state
   */
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
