import { create } from 'zustand';

const STORAGE_KEY = 'aubesonore_volume';

// Types
interface PlayerState {
  isPlaying: boolean;
  volume: number;
}

interface PlayerActions {
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
  setSource: (url: string) => void;
}

type PlayerStore = PlayerState & PlayerActions;

// Audio singleton
const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';

const getStoredVolume = (): number => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseFloat(stored) : 1;
};

audio.volume = getStoredVolume();

// Store
export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),

  play: async () => {
    try {
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
    const clampedValue = Math.max(0, Math.min(1, value));
    audio.volume = clampedValue;
    localStorage.setItem(STORAGE_KEY, clampedValue.toString());
    set({ volume: clampedValue });
  },

  setSource: (url: string) => {
    if (audio.src !== url) {
      audio.src = url;
    }
  },
}));

// Legacy exports for compatibility
export const usePlayerStore = usePlayer;

export const PlayerService = {
  setSource: (url: string) => usePlayer.getState().setSource(url),
  play: () => usePlayer.getState().play(),
  stop: () => usePlayer.getState().stop(),
  setVolume: (value: number) => usePlayer.getState().setVolume(value),
};
