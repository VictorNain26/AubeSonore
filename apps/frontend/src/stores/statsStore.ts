import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStatsSlice, cleanOldEvents } from '@aubesonore/core/stats';
import type { StatsStore } from '@aubesonore/core/stats';
import type { StatsState } from '@aubesonore/shared-types/stats';
import { statsApi } from '../lib/api';
import { useAuthStore } from './authStore';

export type { MonthlyStats } from '@aubesonore/shared-types/stats';

function mergeStats(local: StatsState, server: StatsState): Partial<StatsState> {
  const mergedEvents = [...local.events, ...server.events].filter(
    (e, idx, arr) =>
      arr.findIndex((x) => x.timestamp === e.timestamp && x.artist === e.artist) === idx
  );
  return {
    totalListeningTimeSec: Math.max(local.totalListeningTimeSec, server.totalListeningTimeSec),
    dailyStreak: Math.max(local.dailyStreak, server.dailyStreak),
    lastActiveDay:
      local.lastActiveDay && server.lastActiveDay
        ? local.lastActiveDay > server.lastActiveDay
          ? local.lastActiveDay
          : server.lastActiveDay
        : (local.lastActiveDay ?? server.lastActiveDay),
    events: mergedEvents,
  };
}

interface SyncActions {
  syncFromServer: () => Promise<void>;
}

export const useStatsStore = create<StatsStore & SyncActions>()(
  persist(
    (set, get) => ({
      ...createStatsSlice()(set, get),

      syncFromServer: async (): Promise<void> => {
        if (!useAuthStore.getState().isAuthenticated) return;
        try {
          const server = await statsApi.getStats();
          if (!server) return;
          const local = get();
          set(mergeStats(local, server));
        } catch {
          // Silently fail — local stats still usable offline
        }
      },
    }),
    {
      name: 'aubesonore-stats',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.events = cleanOldEvents(state.events);
        }
      },
    }
  )
);

// Debounced server push: coalesces rapid local changes into a single PUT every 30s.
let syncTimer: ReturnType<typeof setTimeout> | null = null;

useStatsStore.subscribe((state) => {
  if (!useAuthStore.getState().isAuthenticated) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void statsApi
      .putStats({
        events: state.events,
        totalListeningTimeSec: state.totalListeningTimeSec,
        lastActiveDay: state.lastActiveDay,
        dailyStreak: state.dailyStreak,
      })
      .catch(() => {});
  }, 30_000);
});
