// Type imports for Google Cast SDK (ambient types from google-cast.d.ts)

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

// Track cleanup functions to prevent duplicate listeners
let castStateCleanup: (() => void) | null = null;
let sessionStateCleanup: (() => void) | null = null;

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

      // Clean up existing listeners if any (prevent duplicates on hot reload)
      if (castStateCleanup) {
        castStateCleanup();
        castStateCleanup = null;
      }
      if (sessionStateCleanup) {
        sessionStateCleanup();
        sessionStateCleanup = null;
      }

      // Set up cast state listener
      castStateCleanup = onCastStateChanged((state) => {
        const available = state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
        set({ chromecastAvailable: available });
      });

      // Set up session state listener
      sessionStateCleanup = onSessionStateChanged((state) => {
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
