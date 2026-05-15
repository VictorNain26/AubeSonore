import { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Player from '../components/Player';
import { useNowPlaying, isDefaultArtwork } from '../lib/azuracast';
import { PlayerErrorFallback } from '../components/ErrorFallback';

export default function HomePage() {
  const { data: np } = useNowPlaying();
  const artUrl = np?.now_playing?.song.art;
  const isDefaultCover = isDefaultArtwork(artUrl);

  const [internalLoadedArt, setInternalLoadedArt] = useState<string | null>(null);

  // Derive loadedArt: clear if default cover
  const loadedArt = isDefaultCover ? null : internalLoadedArt;

  // Preload image before showing ambient to avoid flicker
  useEffect(() => {
    if (isDefaultCover || !artUrl) {
      return;
    }
    const img = new Image();
    img.src = artUrl;
    img.onload = () => setInternalLoadedArt(artUrl);
    img.onerror = () => setInternalLoadedArt(null);
  }, [artUrl, isDefaultCover]);

  return (
    <div className="relative w-full flex-1 flex items-center justify-center py-4">
      {/* Ambient background — blurred album art */}
      {loadedArt && (
        <img
          key={loadedArt}
          src={loadedArt}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover blur-[60px] scale-150 opacity-30 pointer-events-none transition-opacity duration-1000"
        />
      )}

      {/* Dark overlay for text readability */}
      {loadedArt && <div className="fixed inset-0 bg-black/40 pointer-events-none" />}

      {/* Player content */}
      <div className="relative z-10 w-full">
        <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
          <Player />
        </ErrorBoundary>
      </div>
    </div>
  );
}
