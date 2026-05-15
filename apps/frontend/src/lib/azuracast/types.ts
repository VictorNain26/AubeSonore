import type { NowPlaying } from '@aubesonore/shared-types/azuracast';

// Public state exposed by useNowPlaying().
// - `data`         : last validated payload, or null before first successful fetch
// - `isConnected`  : the polling loop is alive (last fetch succeeded or 304)
// - `error`        : human-readable failure of the last fetch, null when healthy
export interface NowPlayingState {
  data: NowPlaying | null;
  isConnected: boolean;
  error: string | null;
}
