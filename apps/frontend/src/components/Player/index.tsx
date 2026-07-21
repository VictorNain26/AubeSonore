import { useState } from 'react';
import { motion } from 'motion/react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { pageEntry } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Antenna } from './Antenna';
import { PlaybackControls } from './PlaybackControls';
import { SecondaryControls } from './SecondaryControls';
import { ArtistContext } from './ArtistContext';
import { ArtistBio } from './ArtistBio';
import { RecentTracks } from './RecentTracks';

// Player is a composition root: it arranges sub-components only. Every
// leaf subscribes directly to the store it cares about; side effects
// (toasts, stats, media-session) live in <PlayerSideEffects />. The
// AuthModal is hosted at App level, not here.
//
// Scene: single-viewport layout with centered player (row 1) and recent
// tracks rail (row 2). Antenna may render a waveform or null; the scene
// grid absorbs layout changes gracefully.

const NOW = 'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-end lg:gap-10';
const META = 'min-w-0 flex flex-col gap-3 lg:gap-4';

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
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-end lg:gap-10">
            <div className="relative artwork-size mx-auto lg:mx-0">
              <div className="aspect-square rounded-md animate-pulse bg-surface-raised" />
              <div className="absolute -bottom-3 -right-3 size-14 rounded-full animate-pulse bg-surface-raised" />
            </div>
            <div className="min-w-0 flex flex-col gap-3 lg:gap-4">
              <div className="flex flex-col gap-2">
                <div className="h-9 w-3/4 animate-pulse rounded-sm bg-surface-raised" />
                <div className="h-5 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
                <div className="h-4 w-1/2 animate-pulse rounded-sm bg-surface-raised" />
              </div>
            </div>
          </div>
        </div>
        <RecentTracks />
      </div>
    );
  }

  return (
    <motion.div
      className="grid h-full grid-rows-[1fr_auto] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageEntry}
    >
      <div className="flex flex-col items-center justify-center px-6 py-4">
        <div className={NOW}>
          <div className="relative artwork-size mx-auto lg:mx-0">
            <TrackArtwork />
            <div className="absolute -bottom-3 -right-3">
              <PlaybackControls />
            </div>
          </div>
          <div className={META}>
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
            <Antenna />
            <SecondaryControls />
          </div>
        </div>
        <ArtistBio onOpenPanel={() => setArtistPanelOpen(true)} />
      </div>

      <RecentTracks />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </motion.div>
  );
}
