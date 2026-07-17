import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { trackFlip, stagger } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Timeline } from './Timeline';
import { PlaybackControls } from './PlaybackControls';
import { SecondaryControls } from './SecondaryControls';
import { LibraryButton } from './LibraryButton';
import { ListenersBadge } from './ListenersBadge';
import { ArtistContext } from './ArtistContext';
import { RecentRail } from './RecentRail';

// Player is a composition root: it arranges sub-components only. Every
// leaf subscribes directly to the store it cares about; side effects
// (toasts, stats, media-session) live in <PlayerSideEffects />. The
// AuthModal is hosted at App level, not here.

// Entrée de scène : chaque bloc se révèle un temps après le précédent,
// comme une page qu'on déplie. Ne joue qu'au montage, jamais aux flips.
function Entry({
  order,
  className,
  children,
}: {
  order: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...trackFlip, delay: order * stagger }}
    >
      {children}
    </motion.div>
  );
}

function ControlsRow({ className }: { className: string }) {
  return (
    <div className={className}>
      <SecondaryControls />
      <PlaybackControls />
      <div className="flex-1 flex justify-end items-center gap-2">
        <LibraryButton />
        <ListenersBadge />
      </div>
    </div>
  );
}

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
      <div className="h-full min-h-0 grid grid-rows-[1fr_auto] grid-cols-[minmax(0,1fr)]">
        <div className="min-h-0 min-w-0 grid grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 min-w-0 overflow-y-auto lg:overflow-visible flex flex-col">
            <div className="my-auto w-full min-w-0 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-center lg:gap-12">
              <div className="artwork-size mx-auto lg:mx-0 aspect-square rounded-lg skeleton" />
              <div className="min-w-0 flex flex-col gap-3 lg:gap-5">
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-3/4 skeleton" />
                  <div className="h-5 w-1/3 skeleton" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-10 skeleton" />
                  <div className="flex-1 h-8 skeleton" />
                  <div className="h-3 w-10 skeleton" />
                </div>
                <div className="hidden lg:flex items-center gap-2 pt-1">
                  <div className="size-14 rounded-full skeleton" />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-5 flex items-center gap-2 lg:hidden">
            <div className="size-14 rounded-full skeleton" />
          </div>
        </div>
        <RecentRail />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 grid grid-rows-[1fr_auto] grid-cols-[minmax(0,1fr)]">
      <div className="min-h-0 min-w-0 grid grid-rows-[minmax(0,1fr)_auto]">
        <div className="min-h-0 min-w-0 overflow-y-auto lg:overflow-visible flex flex-col">
          <div className="my-auto w-full min-w-0 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-center lg:gap-12">
            <Entry order={0}>
              <TrackArtwork />
            </Entry>
            <div className="min-w-0 flex flex-col gap-3 lg:gap-5">
              <Entry order={1}>
                <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
              </Entry>
              <Entry order={2}>
                <Timeline />
              </Entry>
              <Entry order={3} className="hidden lg:block">
                <ControlsRow className="flex items-center" />
              </Entry>
            </div>
          </div>
        </div>
        <Entry order={3} className="lg:hidden">
          <ControlsRow className="pt-5 flex items-center" />
        </Entry>
      </div>
      <Entry order={4}>
        <RecentRail />
      </Entry>
      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </div>
  );
}
