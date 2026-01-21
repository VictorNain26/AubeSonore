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

// Enable AirPlay (Safari)
audio.setAttribute('x-webkit-airplay', 'allow');
audio.setAttribute('airplay', 'allow');

/**
 * Get the audio element for AirPlay integration
 */
export function getAudioElement(): HTMLAudioElement {
  return audio;
}

// Web Audio API pour la visualisation
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

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
  if (audioContext) return;

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.8;

  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
};

export const getAnalyser = (): AnalyserNode | null => analyser;

export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),

  play: async () => {
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
