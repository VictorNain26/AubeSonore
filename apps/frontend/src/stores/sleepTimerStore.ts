import { create } from 'zustand';
import { createSleepTimerSlice } from '@aubesonore/core/sleep-timer';
import type { SleepTimerStore } from '@aubesonore/core/sleep-timer';
import { getAudioElement, usePlayer } from '../lib/player';

export const useSleepTimer = create<SleepTimerStore>(
  createSleepTimerSlice({
    getVolume: () => getAudioElement().volume,
    setVolume: (v) => {
      getAudioElement().volume = v;
    },
    stop: () => usePlayer.getState().stop(),
  })
);
