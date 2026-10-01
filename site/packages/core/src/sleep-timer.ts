import type { SleepTimerState, SleepTimerMode } from '@aubesonore/shared-types/sleep-timer';

export type { SleepTimerState, SleepTimerMode };

export interface SleepTimerAdapter {
  getVolume: () => number;
  setVolume: (v: number) => void;
  stop: () => void;
}

interface SleepTimerActions {
  start: (minutes: number) => void;
  startEndOfTrack: () => void;
  tick: () => void;
  cancel: () => void;
  triggerEndOfTrack: () => void;
}

export type SleepTimerStore = SleepTimerState & SleepTimerActions;

const FADE_DURATION_MS = 30_000; // 30 seconds fade-out

/**
 * Creates a Zustand state creator for the sleep timer.
 * Each platform provides its own adapter for volume control and stop.
 */
export function createSleepTimerSlice(adapter: SleepTimerAdapter) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function clearTimerInterval(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return (
    set: (partial: Partial<SleepTimerState>) => void,
    get: () => SleepTimerStore
  ): SleepTimerStore => ({
    isActive: false,
    endTime: null,
    remainingMs: 0,
    originalVolume: 1,
    isFadingOut: false,
    mode: null,

    start: (minutes: number): void => {
      clearTimerInterval();
      const now = Date.now();
      const endTime = now + minutes * 60_000;

      set({
        isActive: true,
        endTime,
        remainingMs: minutes * 60_000,
        originalVolume: adapter.getVolume(),
        isFadingOut: false,
        mode: 'timer',
      });

      intervalId = setInterval(() => get().tick(), 1000);
    },

    startEndOfTrack: (): void => {
      clearTimerInterval();

      set({
        isActive: true,
        endTime: null,
        remainingMs: 0,
        originalVolume: adapter.getVolume(),
        isFadingOut: false,
        mode: 'end-of-track',
      });
    },

    triggerEndOfTrack: (): void => {
      const { isActive, mode, originalVolume } = get();
      if (!isActive || mode !== 'end-of-track') return;

      adapter.setVolume(originalVolume);
      adapter.stop();

      set({
        isActive: false,
        endTime: null,
        remainingMs: 0,
        isFadingOut: false,
        mode: null,
      });
    },

    tick: (): void => {
      const { endTime, originalVolume, isActive } = get();
      if (!isActive || !endTime) return;

      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearTimerInterval();
        adapter.setVolume(originalVolume);
        adapter.stop();

        set({
          isActive: false,
          endTime: null,
          remainingMs: 0,
          isFadingOut: false,
          mode: null,
        });
        return;
      }

      if (remaining <= FADE_DURATION_MS) {
        const fadeProgress = remaining / FADE_DURATION_MS;
        adapter.setVolume(originalVolume * fadeProgress);
        set({ remainingMs: remaining, isFadingOut: true });
      } else {
        set({ remainingMs: remaining });
      }
    },

    cancel: (): void => {
      clearTimerInterval();
      const { originalVolume, isFadingOut } = get();

      if (isFadingOut) {
        adapter.setVolume(originalVolume);
      }

      set({
        isActive: false,
        endTime: null,
        remainingMs: 0,
        isFadingOut: false,
        mode: null,
      });
    },
  });
}
