import { create } from 'zustand';
import { getAudioElement } from '../lib/player';
import { usePlayer } from '../lib/player';

interface SleepTimerState {
  isActive: boolean;
  endTime: number | null;
  remainingMs: number;
  originalVolume: number;
  isFadingOut: boolean;
  mode: 'timer' | 'end-of-track' | null;
}

interface SleepTimerActions {
  start: (minutes: number) => void;
  startEndOfTrack: () => void;
  tick: () => void;
  cancel: () => void;
  triggerEndOfTrack: () => void;
}

type SleepTimerStore = SleepTimerState & SleepTimerActions;

const FADE_DURATION_MS = 30_000; // 30 seconds fade-out

let intervalId: ReturnType<typeof setInterval> | null = null;

function clearTimerInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export const useSleepTimer = create<SleepTimerStore>((set, get) => ({
  isActive: false,
  endTime: null,
  remainingMs: 0,
  originalVolume: 1,
  isFadingOut: false,
  mode: null,

  start: (minutes: number) => {
    clearTimerInterval();
    const audio = getAudioElement();
    const now = Date.now();
    const endTime = now + minutes * 60_000;

    set({
      isActive: true,
      endTime,
      remainingMs: minutes * 60_000,
      originalVolume: audio.volume,
      isFadingOut: false,
      mode: 'timer',
    });

    intervalId = setInterval(() => get().tick(), 1000);
  },

  startEndOfTrack: () => {
    clearTimerInterval();
    const audio = getAudioElement();

    set({
      isActive: true,
      endTime: null,
      remainingMs: 0,
      originalVolume: audio.volume,
      isFadingOut: false,
      mode: 'end-of-track',
    });
  },

  triggerEndOfTrack: () => {
    const { isActive, mode, originalVolume } = get();
    if (!isActive || mode !== 'end-of-track') return;

    const audio = getAudioElement();
    audio.volume = originalVolume;
    usePlayer.getState().stop();

    set({
      isActive: false,
      endTime: null,
      remainingMs: 0,
      isFadingOut: false,
      mode: null,
    });
  },

  tick: () => {
    const { endTime, originalVolume, isActive } = get();
    if (!isActive || !endTime) return;

    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) {
      // Time's up — stop playback, restore volume
      clearTimerInterval();
      const audio = getAudioElement();
      audio.volume = originalVolume;
      usePlayer.getState().stop();

      set({
        isActive: false,
        endTime: null,
        remainingMs: 0,
        isFadingOut: false,
        mode: null,
      });
      return;
    }

    // Fade out during last 30 seconds
    if (remaining <= FADE_DURATION_MS) {
      const audio = getAudioElement();
      const fadeProgress = remaining / FADE_DURATION_MS;
      audio.volume = originalVolume * fadeProgress;
      set({ remainingMs: remaining, isFadingOut: true });
    } else {
      set({ remainingMs: remaining });
    }
  },

  cancel: () => {
    clearTimerInterval();
    const { originalVolume, isFadingOut } = get();

    // Restore volume if we were fading
    if (isFadingOut) {
      const audio = getAudioElement();
      audio.volume = originalVolume;
    }

    set({
      isActive: false,
      endTime: null,
      remainingMs: 0,
      isFadingOut: false,
      mode: null,
    });
  },
}));
