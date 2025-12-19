import { create } from 'zustand';

export interface NowPlaying {
  station?: {
    name: string;
    description?: string;
  };
  song?: {
    title: string;
    artist: string;
    album?: string;
    art?: string;
  };
}

interface PlayerStore {
  isPlaying: boolean;
  volume: number;
  nowPlaying: NowPlaying | null;
  setPlaying: (_state: boolean) => void;
  setVolume: (_value: number) => void;
  setNowPlaying: (_nowPlaying: NowPlaying | null) => void;
}

const savedVolume = parseFloat(localStorage.getItem('ourmusic_volume') ?? '1') ?? 1;

const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';
audio.volume = savedVolume;

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: savedVolume,
  nowPlaying: null,

  setPlaying: (state: boolean): void => set({ isPlaying: state }),
  setVolume: (value: number): void => {
    audio.volume = value;
    localStorage.setItem('ourmusic_volume', value.toString());
    set({ volume: value });
  },
  setNowPlaying: (nowPlaying: NowPlaying | null): void => set({ nowPlaying }),
}));

export const PlayerService = {
  setSource: (url: string): void => {
    if (audio.src !== url) {
      audio.src = url;
    }
  },

  play: async (): Promise<void> => {
    try {
      await audio.play();
      usePlayerStore.getState().setPlaying(true);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[PlayerService → play]', err);
      usePlayerStore.getState().setPlaying(false);
    }
  },

  stop: (): void => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    usePlayerStore.getState().setPlaying(false);
  },

  setVolume: (value: number): void => {
    audio.volume = value;
    localStorage.setItem('ourmusic_volume', value.toString());
    usePlayerStore.getState().setVolume(value);
  },

  getVolume: (): number => audio.volume,

  isPlaying: (): boolean => !audio.paused && !audio.ended && !!audio.src,

  on: (event: string, callback: EventListener): void => {
    audio.addEventListener(event, callback);
  },

  off: (event: string, callback: EventListener): void => {
    audio.removeEventListener(event, callback);
  },
};
