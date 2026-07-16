import { useState } from 'react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';

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

export default function Player() {
  const hasData = useNowPlayingStore((s) => s.data !== null);
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data } = useArtistInfo(artistName);
  const [artistPanelOpen, setArtistPanelOpen] = useState(false);

  if (!hasData) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-start gap-6 mb-6">
          <div className="w-full max-w-[280px] aspect-square rounded-lg skeleton" />
          <div className="w-full flex flex-col gap-2">
            <div className="h-10 w-3/4 rounded skeleton" />
            <div className="h-5 w-1/3 rounded skeleton" />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-3 w-10 rounded skeleton" />
          <div className="flex-1 h-8 rounded skeleton" />
          <div className="h-3 w-10 rounded skeleton" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-14 h-14 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-6">
        <TrackArtwork />
        <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
      </div>

      <Timeline />

      <div className="mt-4 flex items-center">
        <SecondaryControls />
        <PlaybackControls />
        <div className="flex-1 flex justify-end items-center gap-2">
          <LibraryButton />
          <ListenersBadge />
        </div>
      </div>

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />

      <RecentRail />
    </div>
  );
}
