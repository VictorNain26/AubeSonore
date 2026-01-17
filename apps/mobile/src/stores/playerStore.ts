import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  playRadio,
  stopRadio,
  setPlayerVolume,
  updateNowPlayingMetadata,
  isPlayerPlaying,
} from '../services/trackPlayer';
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
  play: () => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  subscribeToNowPlaying: () => () => void;
  clearError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const usePlayerStore = create<PlayerStore>((set, get) => ({
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
        await setPlayerVolume(volume);
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

    // Check if already playing
    const playing = await isPlayerPlaying();
    set({ isPlaying: playing });
  },

  play: async () => {
    try {
      set({ isLoading: true, error: null });

      await playRadio();

      // Update lock screen metadata if we have song info
      const { currentSong } = get();
      if (currentSong) {
        await updateNowPlayingMetadata(
          currentSong.title,
          currentSong.artist,
          currentSong.art
        );
      }

      set({ isPlaying: true, isLoading: false });
    } catch (error) {
      set({
        isPlaying: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur de lecture',
      });
    }
  },

  stop: async () => {
    try {
      await stopRadio();
      set({ isPlaying: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur lors de l'arrêt",
      });
    }
  },

  setVolume: async (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    set({ volume: clamped });

    try {
      await setPlayerVolume(clamped);
      await AsyncStorage.setItem(VOLUME_STORAGE_KEY, clamped.toString());
    } catch {
      // Ignore errors
    }
  },

  subscribeToNowPlaying: () => {
    const unsubscribe = azuraCastWS.subscribe(
      // On now playing update
      async (data: NowPlaying) => {
        const currentSong = data.now_playing?.song || null;
        set({ nowPlaying: data, currentSong });

        // Update lock screen metadata if playing
        const { isPlaying } = get();
        if (isPlaying && currentSong) {
          await updateNowPlayingMetadata(
            currentSong.title,
            currentSong.artist,
            currentSong.art
          );
        }
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
