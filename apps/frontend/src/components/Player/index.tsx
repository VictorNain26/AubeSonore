import { useState } from 'react';
import { motion } from 'motion/react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { pageEntry } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { AntennaStatus } from './AntennaStatus';
import { Antenna } from './Antenna';
import { PlaybackControls } from './PlaybackControls';
import { SecondaryControls } from './SecondaryControls';
import { ArtistContext } from './ArtistContext';
import { ArtistBio } from './ArtistBio';
import { StationLog } from './StationLog';

// Player is a composition root: it arranges sub-components only. Every
// leaf subscribes directly to the store it cares about; side effects
// (toasts, stats, media-session) live in <PlayerSideEffects />. The
// AuthModal is hosted at App level, not here.
//
// Two columns on wide screens — le direct (now playing) beside le journal
// (StationLog, what just aired). On narrow screens the two stack and the
// page scrolls naturally.

const SCENE = 'flex flex-col gap-6 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_17rem]';
const DIRECT = 'min-w-0 flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-6 lg:pt-2';
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
      <div className={SCENE}>
        <div className={DIRECT}>
          <div className="rule pt-2">
            <div className="h-4 w-32 skeleton" />
          </div>
          <div className={NOW}>
            <div className="relative artwork-size mx-auto lg:mx-0">
              <div className="aspect-square rounded-lg skeleton" />
              <div className="absolute -bottom-3 -right-3 size-14 rounded-full skeleton" />
            </div>
            <div className={META}>
              <div className="flex flex-col gap-2">
                <div className="h-9 w-3/4 skeleton" />
                <div className="h-5 w-1/3 skeleton" />
                <div className="h-4 w-1/2 skeleton" />
              </div>
            </div>
          </div>
        </div>
        <StationLog />
      </div>
    );
  }

  return (
    <motion.div
      className={SCENE}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageEntry}
    >
      <div className={DIRECT}>
        <div className="rule pt-2">
          <AntennaStatus />
        </div>
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

      <StationLog />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </motion.div>
  );
}
