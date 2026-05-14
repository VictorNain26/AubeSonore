import { create } from 'zustand';
import { STREAM_URL } from '../utils/config';

const STORAGE_KEY = 'aubesonore_volume';

export interface PlayError {
  code: 'aborted' | 'network' | 'unknown';
  message: string;
}

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  playError: PlayError | null;
}

interface PlayerActions {
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
  clearPlayError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

const audio = new Audio();
audio.preload = 'none';
audio.crossOrigin = 'anonymous';
audio.setAttribute('x-webkit-airplay', 'allow');
audio.setAttribute('airplay', 'allow');

export function getAudioElement(): HTMLAudioElement {
  return audio;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
// Tracks if a stop() is in progress so the resulting audio error event
// is not surfaced as a playError to the user.
let isStopping = false;

const getStoredVolume = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : 1;
  } catch {
    return 1;
  }
};

audio.volume = getStoredVolume();

const initAudioContext = () => {
  if (audioContext && sourceNode) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.8;
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
};

export const getAnalyser = (): AnalyserNode | null => analyser;

function classifyPlayError(err: unknown): PlayError | null {
  if (err instanceof Error && err.name === 'AbortError') {
    return null;
  }
  if (err instanceof Error) {
    const isNetwork = /network|fetch|load/i.test(err.message);
    return {
      code: isNetwork ? 'network' : 'unknown',
      message: err.message,
    };
  }
  return { code: 'unknown', message: String(err) };
}

export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),
  playError: null,

  play: async () => {
    set({ playError: null });
    try {
      initAudioContext();
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
      set({ isPlaying: true });
    } catch (error) {
      const playError = classifyPlayError(error);
      console.error('[Player] Playback failed:', error);
      set({ isPlaying: false, playError });
    }
  },

  stop: () => {
    isStopping = true;
    audio.pause();
    audio.src = '';
    set({ isPlaying: false, playError: null });
    queueMicrotask(() => {
      isStopping = false;
    });
  },

  setVolume: (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    audio.volume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch {
      // localStorage unavailable (private mode) — keep in-memory state only
    }
    set({ volume: clamped });
  },

  clearPlayError: () => set({ playError: null }),
}));

audio.addEventListener('error', () => {
  if (isStopping) return;
  console.error('[Player] Audio element error:', audio.error);
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // No-op: keep existing audio + source node, do not re-init
  });
}
