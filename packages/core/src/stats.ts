import type { TrackEvent, MonthlyStats, StatsState } from '@aubesonore/shared-types/stats';

export type { TrackEvent, MonthlyStats, StatsState };

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function cleanOldEvents(events: TrackEvent[]): TrackEvent[] {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
  return events.filter((e) => e.timestamp > cutoff);
}

export function computeMonthlyStats(state: StatsState): MonthlyStats {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentEvents = state.events.filter((e) => e.timestamp > thirtyDaysAgo);

  const artistCounts = new Map<string, number>();
  for (const event of recentEvents) {
    const count = artistCounts.get(event.artist) || 0;
    artistCounts.set(event.artist, count + 1);
  }

  const topArtists = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalMinutes: Math.round(state.totalListeningTimeSec / 60),
    uniqueArtists: artistCounts.size,
    tracksHeard: recentEvents.length,
    streak: state.dailyStreak,
    topArtists,
  };
}

interface StatsActions {
  tickListeningTime: () => void;
  recordTrackChange: (artist: string, title: string) => void;
  getMonthlyStats: () => MonthlyStats;
}

export type StatsStore = StatsState & StatsActions;

/**
 * Creates a Zustand state creator for the stats store.
 * Wrap with `persist(createStatsSlice(), { ... })` in each app.
 */
export function createStatsSlice() {
  return (
    set: (partial: Partial<StatsState> | ((state: StatsStore) => Partial<StatsStore>)) => void,
    get: () => StatsStore
  ): StatsStore => ({
    events: [],
    totalListeningTimeSec: 0,
    lastActiveDay: null,
    dailyStreak: 0,

    tickListeningTime: (): void => {
      const today = getTodayKey();
      const { lastActiveDay, dailyStreak } = get();

      let newStreak = dailyStreak;
      if (lastActiveDay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];

        if (lastActiveDay === yesterdayKey) {
          newStreak = dailyStreak + 1;
        } else if (lastActiveDay !== today) {
          newStreak = 1;
        }
      }

      set({
        totalListeningTimeSec: get().totalListeningTimeSec + 10,
        lastActiveDay: today,
        dailyStreak: newStreak,
      });
    },

    recordTrackChange: (artist: string, title: string): void => {
      const event: TrackEvent = {
        artist,
        title,
        timestamp: Date.now(),
      };

      set((state) => ({
        events: [...state.events, event],
      }));
    },

    getMonthlyStats: (): MonthlyStats => computeMonthlyStats(get()),
  });
}
