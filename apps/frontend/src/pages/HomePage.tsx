import { useState, useEffect } from 'react';
import Player from '../components/Player';
import { useNowPlaying } from '../lib/azuracast';

export default function HomePage() {
  const { data: np } = useNowPlaying();
  const artUrl = np?.now_playing?.song.art;

  // Detect default/generic covers to skip ambient
  const isDefaultCover =
    !artUrl ||
    artUrl.includes('generic') ||
    artUrl.includes('default') ||
    artUrl.includes('placeholder');

  const [loadedArt, setLoadedArt] = useState<string | null>(null);

  // Preload image before showing ambient to avoid flicker
  useEffect(() => {
    if (isDefaultCover) {
      setLoadedArt(null);
      return;
    }
    const img = new Image();
    img.src = artUrl!;
    img.onload = () => setLoadedArt(artUrl!);
    img.onerror = () => setLoadedArt(null);
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
        <Player />
      </div>
    </div>
  );
}
