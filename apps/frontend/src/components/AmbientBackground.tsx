import { useEffect, useState } from 'react';
import { useNowPlaying, isDefaultArtwork } from '../lib/azuracast';

// Blurred ambient backdrop. Reads the now-playing cover, preloads the
// image off-render, and only paints once the load succeeds — that
// preload is the reason this lives in JS rather than in pure CSS:
// without it we would see a flash of broken / oversized image on every
// track flip. Renders nothing when the cover is the AzuraCast default
// or fails to load.

export function AmbientBackground() {
  const { data: np } = useNowPlaying();
  const artUrl = np?.now_playing?.song.art;
  const isDefaultCover = isDefaultArtwork(artUrl);

  const [preloadedArt, setPreloadedArt] = useState<string | null>(null);

  useEffect(() => {
    if (isDefaultCover || !artUrl) return;
    const img = new Image();
    img.src = artUrl;
    img.onload = () => setPreloadedArt(artUrl);
    img.onerror = () => setPreloadedArt(null);
  }, [artUrl, isDefaultCover]);

  // Derived: paint only when the preloaded URL matches the current one,
  // so an in-flight load of the *previous* cover never flashes against
  // the new track. Default/missing covers never paint.
  const loadedArt = !isDefaultCover && artUrl && preloadedArt === artUrl ? preloadedArt : null;

  if (!loadedArt) return null;

  return (
    <>
      <img
        key={loadedArt}
        src={loadedArt}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover blur-[60px] scale-150 opacity-30 pointer-events-none transition-opacity duration-1000"
      />
      <div className="fixed inset-0 bg-overlay/40 pointer-events-none" />
    </>
  );
}
