import { create } from 'zustand';
import { Platform } from 'react-native';
import { endSession } from '../lib/cast';
import type { CastStore, CastType } from '../types/cast';

/**
 * Cast Store - Single source of truth for cast state
 *
 * Best Practices 2025/2026:
 * - Store only holds state, not business logic
 * - Actions are minimal setters
 * - Complex logic lives in lib/cast.ts
 */
export const useCastStore = create<CastStore>((set, get) => ({
  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  chromecastAvailable: false,
  airplayAvailable: Platform.OS === 'ios',
  connectionState: 'disconnected',
  isCasting: false,
  castType: null,
  deviceName: null,
  isConnecting: false,
  error: null,

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  initialize: async () => {
    // Initialization is handled by CastProvider
  },

  startChromecast: () => {
    // Handled by CastButton via lib/cast.showCastPicker()
  },

  stopCasting: async () => {
    await endSession();
    set({
      isCasting: false,
      castType: null,
      deviceName: null,
      connectionState: 'disconnected',
      error: null,
    });
  },

  setCasting: (isCasting: boolean, device?: string, type?: CastType) => {
    set({
      isCasting,
      deviceName: device ?? null,
      castType: type ?? null,
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

  setAirplayAvailable: (available: boolean) => {
    set({ airplayAvailable: available });
  },

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
