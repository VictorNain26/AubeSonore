import { create } from 'zustand';
import { STREAM_URL } from '../utils/config';

const STORAGE_KEY = 'aubesonore_volume';

interface PlayerState {
  isPlaying: boolean;
  volume: number;
}

interface PlayerActions {
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
}

type PlayerStore = PlayerState & PlayerActions;

// Audio singleton
const audio = new Audio();
audio.preload = 'none';
audio.crossOrigin = 'anonymous';
audio.src = STREAM_URL;

const getStoredVolume = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : 1;
  } catch {
    return 1;
  }
};

audio.volume = getStoredVolume();

export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),

  play: async () => {
    try {
      // Recharger le flux pour être en direct
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
      set({ isPlaying: true });
    } catch (error) {
      console.error('[Player] Playback failed:', error);
      set({ isPlaying: false });
    }
  },

  stop: () => {
    audio.pause();
    audio.src = '';
    set({ isPlaying: false });
  },

  setVolume: (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    audio.volume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch {
      // Ignore storage errors
    }
    set({ volume: clamped });
  },
}));
