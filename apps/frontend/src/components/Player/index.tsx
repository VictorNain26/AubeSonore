import { useState } from 'react';
import * as m from 'motion/react-m';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { pageEntry } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Antenna } from './Antenna';
import { PlaybackControls } from './PlaybackControls';
import { TrackActions } from './TrackActions';
import { SecondaryControls } from './SecondaryControls';
import { ArtistContext } from './ArtistContext';
import { ArtistBio } from './ArtistBio';
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
  const { data } = useArtistInfo(artistName);
  const [artistPanelOpen, setArtistPanelOpen] = useState(false);
  const [prevArtistName, setPrevArtistName] = useState(artistName);

  if (artistName !== prevArtistName) {
    setPrevArtistName(artistName);
    setArtistPanelOpen(false);
  }

  if (!hasData) {
    return (
      <div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
          <div className={NOW}>
            <div className="artwork-size shrink-0">
              <div className="aspect-square rounded-md animate-pulse bg-surface-raised" />
            </div>
            <div className={META}>
              <div className="h-9 w-3/4 animate-pulse rounded-sm bg-surface-raised" />
              <div className="h-5 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
              <div className={TRANSPORT}>
                <div className="size-14 shrink-0 animate-pulse rounded-full bg-surface-raised" />
                <div className="h-10 flex-1 animate-pulse rounded-sm bg-surface-raised" />
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
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
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
            <div className="hidden lg:block">
              <ArtistBio onOpenPanel={() => setArtistPanelOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <RecentTracks />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </m.div>
  );
}
