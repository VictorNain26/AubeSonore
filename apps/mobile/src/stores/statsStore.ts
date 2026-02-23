import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TrackEvent {
  artist: string;
  title: string;
  timestamp: number;
}

interface StatsState {
  events: TrackEvent[];
  totalListeningTimeSec: number;
  lastActiveDay: string | null;
  dailyStreak: number;
}

export interface MonthlyStats {
  totalMinutes: number;
  uniqueArtists: number;
  tracksHeard: number;
  streak: number;
  topArtists: { name: string; count: number }[];
}

interface StatsActions {
  tickListeningTime: () => void;
  recordTrackChange: (artist: string, title: string) => void;
  getMonthlyStats: () => MonthlyStats;
}

type StatsStore = StatsState & StatsActions;

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]!;
}

function cleanOldEvents(events: TrackEvent[]): TrackEvent[] {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
  return events.filter((e) => e.timestamp > cutoff);
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      events: [],
      totalListeningTimeSec: 0,
      lastActiveDay: null,
      dailyStreak: 0,

      tickListeningTime: () => {
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

      recordTrackChange: (artist: string, title: string) => {
        const event: TrackEvent = {
          artist,
          title,
          timestamp: Date.now(),
        };

        set((state) => ({
          events: [...state.events, event],
        }));
      },

      getMonthlyStats: (): MonthlyStats => {
        const state = get();
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
      },
    }),
    {
      name: 'aubesonore-stats',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.events = cleanOldEvents(state.events);
        }
      },
    }
  )
);
