import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStatsSlice, cleanOldEvents } from '@aubesonore/core/stats';
import type { StatsStore } from '@aubesonore/core/stats';

export type { MonthlyStats } from '@aubesonore/shared-types/stats';

export const useStatsStore = create<StatsStore>()(
  persist(createStatsSlice(), {
    name: 'aubesonore-stats',
    onRehydrateStorage: () => (state) => {
      if (state) {
        state.events = cleanOldEvents(state.events);
      }
    },
  })
);
