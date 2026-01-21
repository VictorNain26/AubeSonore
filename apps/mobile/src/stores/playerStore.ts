import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { azuraCastWS, fetchNowPlaying } from '../services/azuracast';
import type { NowPlaying, Song } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

const VOLUME_STORAGE_KEY = 'aubesonore_volume';

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  nowPlaying: NowPlaying | null;
  currentSong: Song | null;
}

interface PlayerActions {
  initialize: () => Promise<void>;
  setIsPlaying: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setVolume: (value: number) => Promise<void>;
  subscribeToNowPlaying: () => () => void;
  clearError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const usePlayerStore = create<PlayerStore>((set, _get) => ({
  isPlaying: false,
  volume: 1,
  isLoading: false,
  isConnected: false,
  error: null,
  nowPlaying: null,
  currentSong: null,

  initialize: async () => {
    // Load stored volume
    try {
      const storedVolume = await AsyncStorage.getItem(VOLUME_STORAGE_KEY);
      if (storedVolume) {
        const volume = parseFloat(storedVolume);
        set({ volume });
      }
    } catch {
      // Ignore storage errors
    }

    // Fetch initial now playing data
    const nowPlaying = await fetchNowPlaying();
    if (nowPlaying) {
      set({
        nowPlaying,
        currentSong: nowPlaying.now_playing?.song || null,
      });
    }
  },

  setIsPlaying: (value: boolean) => set({ isPlaying: value }),

  setIsLoading: (value: boolean) => set({ isLoading: value }),

  setError: (error: string | null) => set({ error }),

  setVolume: async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    set({ volume: clamped });

    try {
      await AsyncStorage.setItem(VOLUME_STORAGE_KEY, clamped.toString());
    } catch {
      // Ignore errors
    }
  },

  subscribeToNowPlaying: () => {
    const unsubscribe = azuraCastWS.subscribe(
      // On now playing update
      (data: NowPlaying) => {
        const currentSong = data.now_playing?.song || null;
        set({ nowPlaying: data, currentSong });
      },
      // On connection change
      (connected: boolean) => {
        set({ isConnected: connected });
      },
      // On error
      (error: string) => {
        set({ error });
      }
    );

    return unsubscribe;
  },

  clearError: () => set({ error: null }),
}));
