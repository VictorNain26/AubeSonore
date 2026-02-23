import { create } from 'zustand';
import { usePlayerStore } from './playerStore';

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

const FADE_DURATION_MS = 30_000; // 30s fade-out

let intervalId: ReturnType<typeof setInterval> | null = null;

function clearTimerInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Sleep Timer Store for Mobile
 *
 * Uses playerStore.setVolume() instead of direct audio element access.
 * The AudioProvider listens to volume changes from the store.
 */
export const useSleepTimer = create<SleepTimerStore>((set, get) => ({
  isActive: false,
  endTime: null,
  remainingMs: 0,
  originalVolume: 1,
  isFadingOut: false,
  mode: null,

  start: (minutes: number) => {
    clearTimerInterval();
    const currentVolume = usePlayerStore.getState().volume;
    const now = Date.now();
    const endTime = now + minutes * 60_000;

    set({
      isActive: true,
      endTime,
      remainingMs: minutes * 60_000,
      originalVolume: currentVolume,
      isFadingOut: false,
      mode: 'timer',
    });

    intervalId = setInterval(() => get().tick(), 1000);
  },

  startEndOfTrack: () => {
    clearTimerInterval();
    const currentVolume = usePlayerStore.getState().volume;

    set({
      isActive: true,
      endTime: null,
      remainingMs: 0,
      originalVolume: currentVolume,
      isFadingOut: false,
      mode: 'end-of-track',
    });
  },

  triggerEndOfTrack: () => {
    const { isActive, mode, originalVolume } = get();
    if (!isActive || mode !== 'end-of-track') return;

    // Restore volume then stop — AudioProvider will handle the actual pause
    usePlayerStore.getState().setVolume(originalVolume);

    set({
      isActive: false,
      endTime: null,
      remainingMs: 0,
      isFadingOut: false,
      mode: null,
    });

    // We set a flag that the player should stop — handled externally
    // by the player.tsx effect that watches for this
  },

  tick: () => {
    const { endTime, originalVolume, isActive } = get();
    if (!isActive || !endTime) return;

    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) {
      // Time's up — restore volume and stop
      clearTimerInterval();
      usePlayerStore.getState().setVolume(originalVolume);

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
      const fadeProgress = remaining / FADE_DURATION_MS;
      usePlayerStore.getState().setVolume(originalVolume * fadeProgress);
      set({ remainingMs: remaining, isFadingOut: true });
    } else {
      set({ remainingMs: remaining });
    }
  },

  cancel: () => {
    clearTimerInterval();
    const { originalVolume, isFadingOut } = get();

    if (isFadingOut) {
      usePlayerStore.getState().setVolume(originalVolume);
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
