import * as m from 'motion/react-m';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistNavigation } from '../../hooks/useArtistNavigation';
import { pageEntry } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Antenna } from './Antenna';
import { PlaybackControls } from './PlaybackControls';
import { TrackActions } from './TrackActions';
import { SecondaryControls } from './SecondaryControls';
import { RecentTracks } from './RecentTracks';

const NOW =
  'flex w-full max-w-4xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10';
const META =
  'flex w-full min-w-0 flex-col items-center gap-4 text-center lg:items-start lg:text-left';
const TRANSPORT = 'flex w-full items-center';
const ACTIONS = 'flex items-center gap-2 justify-center lg:justify-start';

export default function Player() {
  const hasData = useNowPlayingStore((s) => s.data !== null);
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const goToArtist = useArtistNavigation();

  if (!hasData) {
    return (
      <div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
          <div className={NOW}>
            <div className="artwork-size shrink-0">
              <div className="bg-surface-raised aspect-square animate-pulse rounded-md" />
            </div>
            <div className={META}>
              <div className="bg-surface-raised h-9 w-3/4 animate-pulse rounded-sm" />
              <div className="bg-surface-raised h-5 w-1/3 animate-pulse rounded-sm" />
              <div className={TRANSPORT}>
                <div className="bg-surface-raised size-14 shrink-0 animate-pulse rounded-full" />
                <div className="bg-surface-raised h-10 flex-1 animate-pulse rounded-sm" />
              </div>
            </div>
          </div>
        </div>
        <RecentTracks />
      </div>
    );
  }

  return (
    <m.div
      className="grid h-full grid-rows-[1fr_auto] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageEntry}
    >
      <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
        <div className={NOW}>
          <div className="artwork-size shrink-0">
            <TrackArtwork />
          </div>
          <div className={META}>
            <TrackMeta
              onArtistInfo={
                artistName
                  ? () => {
                      void goToArtist(artistName);
                    }
                  : undefined
              }
            />
            <div className={TRANSPORT}>
              <PlaybackControls />
              <div className="min-w-0 flex-1">
                <Antenna />
              </div>
            </div>
            <div className={ACTIONS}>
              <TrackActions />
              <SecondaryControls />
            </div>
          </div>
        </div>
      </div>

      <RecentTracks />
    </m.div>
  );
}
