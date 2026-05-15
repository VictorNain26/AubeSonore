// Public API of the AzuraCast client. Consumers import from '../lib/azuracast'
// and never reach into individual modules — keeps the surface stable.

export { useNowPlaying, __resetNowPlayingStore } from './store';
// isDefaultArtwork moved to @aubesonore/core/azuracast (shared with mobile +
// backend). Re-exported here so existing import sites keep working.
export { isDefaultArtwork } from '@aubesonore/core/azuracast';
export { NowPlayingSchema, type ValidatedNowPlaying } from './validators';
export type { NowPlayingState } from './types';

// Re-export the shared-types domain shapes so a consumer never needs two
// imports for "AzuraCast types".
export type {
  Song,
  SongEntry,
  Mount,
  Station,
  Listeners,
  LiveStatus,
  NowPlaying,
} from '@aubesonore/shared-types/azuracast';
