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

const NOW =
  'flex w-full max-w-3xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10';
const META =
  'flex w-full min-w-0 flex-col items-center gap-3 text-center lg:items-start lg:text-left';

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
            <div className="relative artwork-size shrink-0">
              <div className="aspect-square rounded-md animate-pulse bg-surface-raised" />
              <div className="absolute -bottom-3 -right-3 size-14 lg:size-16 rounded-full animate-pulse bg-surface-raised" />
            </div>
            <div className={META}>
              <div className="h-9 w-3/4 animate-pulse rounded-sm bg-surface-raised" />
              <div className="h-5 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
              <div className="h-4 w-1/2 animate-pulse rounded-sm bg-surface-raised" />
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
      <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
        <div className={NOW}>
          <div className="relative artwork-size shrink-0">
            <TrackArtwork />
            <div className="absolute -bottom-3 -right-3">
              <PlaybackControls />
            </div>
          </div>
          <div className={META}>
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
            <Antenna />
            <SecondaryControls />
            <div className="hidden lg:block">
              <ArtistBio onOpenPanel={() => setArtistPanelOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <RecentTracks />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </motion.div>
  );
}
