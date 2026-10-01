// Stats types — shared between frontend and mobile

export interface TrackEvent {
  artist: string;
  title: string;
  timestamp: number;
}

export interface MonthlyStats {
  totalMinutes: number;
  uniqueArtists: number;
  tracksHeard: number;
  streak: number;
  topArtists: { name: string; count: number }[];
}

export interface StatsState {
  events: TrackEvent[];
  totalListeningTimeSec: number;
  lastActiveDay: string | null;
  dailyStreak: number;
}
