import { create } from 'zustand';

const STORAGE_KEY = 'aubesonore_volume';
const STREAM_URL = 'http://116.203.46.203/radio/8000/radio.mp3';

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
      // Ensure source is set
      if (!audio.src || audio.src === '') {
        audio.src = STREAM_URL;
      }
      await audio.play();
      set({ isPlaying: true });
    } catch (error) {
      console.error('[Player] Playback failed:', error);
      set({ isPlaying: false });
    }
  },

  stop: () => {
    audio.pause();
    audio.currentTime = 0;
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
