import { create } from 'zustand';
import { createSleepTimerSlice } from '@aubesonore/core/sleep-timer';
import type { SleepTimerStore } from '@aubesonore/core/sleep-timer';
import { usePlayerStore } from './playerStore';

export const useSleepTimer = create<SleepTimerStore>(
  createSleepTimerSlice({
    getVolume: () => usePlayerStore.getState().volume,
    setVolume: (v) => usePlayerStore.getState().setVolume(v),
    stop: () => {
      // Stop is handled externally by the player.tsx effect
      // Setting volume triggers the AudioProvider
    },
  })
);
