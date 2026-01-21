import { create } from 'zustand';
import { Platform } from 'react-native';
import type { CastStore, CastType } from '../types/cast';

export const useCastStore = create<CastStore>((set, get) => ({
  // Initial state
  chromecastAvailable: false,
  airplayAvailable: Platform.OS === 'ios', // AirPlay is always potentially available on iOS
  connectionState: 'disconnected',
  isCasting: false,
  castType: null,
  deviceName: null,
  isConnecting: false,
  error: null,

  // Initialize cast SDK
  initialize: async () => {
    // Initialization is handled by CastProvider
    // This is a placeholder for any async init logic
  },

  // Start Chromecast session (opens device picker)
  startChromecast: () => {
    // This will be called from CastButton
    // The actual cast session is managed by react-native-google-cast
  },

  // Stop current cast session
  stopCasting: () => {
    set({
      isCasting: false,
      castType: null,
      deviceName: null,
      connectionState: 'disconnected',
      error: null,
    });
  },

  // Set casting state
  setCasting: (isCasting: boolean, device?: string, type?: CastType) => {
    set({
      isCasting,
      deviceName: device ?? null,
      castType: type ?? null,
      connectionState: isCasting ? 'connected' : 'disconnected',
      isConnecting: false,
    });
  },

  // Set connecting state
  setConnecting: (isConnecting: boolean) => {
    set({
      isConnecting,
      connectionState: isConnecting ? 'connecting' : get().isCasting ? 'connected' : 'disconnected',
    });
  },

  // Set error
  setError: (error: string | null) => {
    set({ error });
  },

  // Set Chromecast availability
  setChromecastAvailable: (available: boolean) => {
    set({ chromecastAvailable: available });
  },

  // Set AirPlay availability
  setAirplayAvailable: (available: boolean) => {
    set({ airplayAvailable: available });
  },

  // Reset to initial state
  reset: () => {
    set({
      connectionState: 'disconnected',
      isCasting: false,
      castType: null,
      deviceName: null,
      isConnecting: false,
      error: null,
    });
  },
}));
