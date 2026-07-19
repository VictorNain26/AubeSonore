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
import { StationLog } from './StationLog';

// Player is a composition root: it arranges sub-components only. Every
// leaf subscribes directly to the store it cares about; side effects
// (toasts, stats, media-session) live in <PlayerSideEffects />. The
// AuthModal is hosted at App level, not here.
//
// Two columns on wide screens — le direct (now playing) beside le journal
// (StationLog, what just aired). On narrow screens the two stack and the
// page scrolls naturally.

// Transport: the play gesture, alone and first, with volume/output as its
// satellites. Nothing else lives here — library and listeners moved out.
function ControlsRow({ className }: { className: string }) {
  return (
    <div className={className}>
      <PlaybackControls />
      <SecondaryControls />
    </div>
  );
}

const SCENE = 'flex flex-col gap-6 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]';
const DIRECT = 'min-w-0 flex flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-6';
const NOW =
  'flex flex-col gap-4 lg:my-auto lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-center lg:gap-10';
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
          <div className={NOW}>
            <div className="artwork-size mx-auto lg:mx-0 aspect-square rounded-lg skeleton" />
            <div className={META}>
              <div className="flex flex-col gap-2">
                <div className="h-9 w-3/4 skeleton" />
                <div className="h-5 w-1/3 skeleton" />
              </div>
              <div className="h-8 w-full skeleton" />
              <div className="hidden lg:flex items-center gap-4 pt-1">
                <div className="size-16 rounded-full skeleton" />
                <div className="size-10 rounded-md skeleton" />
              </div>
            </div>
          </div>
          <div className="pt-5 flex items-center justify-center gap-4 lg:hidden">
            <div className="size-14 rounded-full skeleton" />
            <div className="size-10 rounded-md skeleton" />
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
        <div className={NOW}>
          <TrackArtwork />
          <div className={META}>
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
            <AntennaStatus />
            <Antenna />
            <ControlsRow className="hidden lg:flex items-center gap-4" />
          </div>
        </div>
        <ControlsRow className="pt-5 lg:hidden flex items-center justify-center gap-4" />
      </div>

      <StationLog />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </motion.div>
  );
}
