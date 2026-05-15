import { useNowPlayingStore } from '../../lib/azuracast';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Timeline } from './Timeline';
import { PlaybackControls } from './PlaybackControls';
import { SecondaryControls } from './SecondaryControls';
import { LibraryButton } from './LibraryButton';
import { ListenersBadge } from './ListenersBadge';
import { ArtistContext } from './ArtistContext';
import { HistoryList } from './HistoryList';

// Player is a composition root: it arranges sub-components only. Every
// leaf subscribes directly to the store it cares about; side effects
// (toasts, stats, media-session) live in <PlayerSideEffects />. The
// AuthModal is hosted at App level, not here.

export default function Player() {
  const hasData = useNowPlayingStore((s) => s.data !== null);

  if (!hasData) {
    return (
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center mb-5">
          <div className="w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl skeleton" />
        </div>
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-4 w-32 rounded skeleton" />
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-3 w-10 rounded skeleton" />
          <div className="flex-1 h-8 rounded skeleton" />
          <div className="h-3 w-10 rounded skeleton" />
        </div>
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
      <div className="flex flex-col items-center mb-5">
        <TrackArtwork />
      </div>

      <TrackMeta />

      <Timeline />

      <div className="flex items-center mb-6 px-2">
        <SecondaryControls />
        <PlaybackControls />
        <div className="flex-1 flex justify-end items-center gap-2">
          <LibraryButton />
          <ListenersBadge />
        </div>
      </div>

      <ArtistContext />

      <HistoryList />
    </div>
  );
}
