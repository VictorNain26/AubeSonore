import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore, isDefaultArtwork } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useInkFlip } from '../../lib/motion';
import { TrackArtworkView } from '../../design/organisms/TrackArtwork';

// Album art only, subscribing directly to the store it needs. No props:
// the container is self-sufficient.

export function TrackArtwork() {
  const { artUrl, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [artError, setArtError] = useState(false);
  const inkFlip = useInkFlip();

  const handleArtError = () => setArtError(true);

  const isDefaultCover = !artUrl || artError || isDefaultArtwork(artUrl);

  return (
    <TrackArtworkView
      artUrl={artUrl}
      title={title}
      seed={`${artist ?? ''}|${title ?? ''}`}
      isDefaultCover={isDefaultCover}
      isPlaying={isPlaying}
      onArtError={handleArtError}
      inkFlip={inkFlip}
    />
  );
}
