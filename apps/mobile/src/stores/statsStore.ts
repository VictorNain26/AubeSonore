import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStatsSlice, cleanOldEvents } from '@aubesonore/core/stats';
import type { StatsStore } from '@aubesonore/core/stats';

export type { MonthlyStats } from '@aubesonore/shared-types/stats';

export const useStatsStore = create<StatsStore>()(
  persist(createStatsSlice(), {
    name: 'aubesonore-stats',
    storage: createJSONStorage(() => AsyncStorage),
    onRehydrateStorage: () => (state) => {
      if (state) {
        state.events = cleanOldEvents(state.events);
      }
    },
  })
);
