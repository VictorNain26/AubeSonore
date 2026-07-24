import { useEffect, useState } from 'react';
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
  const [displayedArt, setDisplayedArt] = useState(artUrl);
  const [prevArtUrl, setPrevArtUrl] = useState(artUrl);
  const [artError, setArtError] = useState(false);
  const inkFlip = useInkFlip();

  const handleArtError = () => setArtError(true);

  // Render-time adjustment for the no-cover case (direct lost); the preload
  // effect below only handles real URLs.
  if (artUrl !== prevArtUrl) {
    setPrevArtUrl(artUrl);
    if (!artUrl) {
      setDisplayedArt(undefined);
      setArtError(false);
    }
  }

  // Preload the incoming cover before swapping it in: otherwise the flip
  // crossfade runs while the new image is still downloading — invisible —
  // and the artwork pops in unanimated once loaded.
  useEffect(() => {
    if (!artUrl || artUrl === displayedArt) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setArtError(false);
      setDisplayedArt(artUrl);
    };
    img.onerror = () => {
      if (cancelled) return;
      setArtError(true);
      setDisplayedArt(artUrl);
    };
    img.src = artUrl;
    return () => {
      cancelled = true;
    };
  }, [artUrl, displayedArt]);

  const isDefaultCover = !displayedArt || artError || isDefaultArtwork(displayedArt);

  return (
    <TrackArtworkView
      artUrl={displayedArt}
      title={title}
      seed={`${artist ?? ''}|${title ?? ''}`}
      isDefaultCover={isDefaultCover}
      isPlaying={isPlaying}
      onArtError={handleArtError}
      inkFlip={inkFlip}
    />
  );
}
