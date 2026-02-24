import { create } from 'zustand';
import { endSession } from '../lib/cast';
import type { CastStore } from '../types/cast';

/**
 * Cast Store - Single source of truth for cast state
 */
export const useCastStore = create<CastStore>((set, get) => ({
  // State
  chromecastAvailable: false,
  connectionState: 'disconnected',
  isCasting: false,
  deviceName: null,
  wasPlayingBeforeCast: false,
  isConnecting: false,
  error: null,

  // Actions
  stopCasting: async () => {
    await endSession();
    set({
      isCasting: false,
      deviceName: null,
      connectionState: 'disconnected',
      error: null,
    });
  },

  setCasting: (isCasting: boolean, device?: string) => {
    set({
      isCasting,
      deviceName: device ?? null,
      connectionState: isCasting ? 'connected' : 'disconnected',
      isConnecting: false,
      error: null,
    });
  },

  setConnecting: (isConnecting: boolean) => {
    set({
      isConnecting,
      connectionState: isConnecting ? 'connecting' : get().isCasting ? 'connected' : 'disconnected',
    });
  },

  setError: (error: string | null) => {
    set({ error, isConnecting: false });
  },

  setChromecastAvailable: (available: boolean) => {
    set({ chromecastAvailable: available });
  },

  setWasPlayingBeforeCast: (value: boolean) => {
    set({ wasPlayingBeforeCast: value });
  },

  reset: () => {
    set({
      connectionState: 'disconnected',
      isCasting: false,
      deviceName: null,
      wasPlayingBeforeCast: false,
      isConnecting: false,
      error: null,
    });
  },
}));
