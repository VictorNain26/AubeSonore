import { create } from 'zustand';
import { createSleepTimerSlice } from '@aubesonore/core/sleep-timer';
import type { SleepTimerStore } from '@aubesonore/core/sleep-timer';
import { getAudioElement, usePlayer } from '../lib/player';

export const useSleepTimer = create<SleepTimerStore>(
  createSleepTimerSlice({
    getVolume: () => usePlayer.getState().volume,
    setVolume: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      getAudioElement().volume = clamped;
      usePlayer.setState({ volume: clamped });
    },
    stop: () => usePlayer.getState().stop(),
  })
);
