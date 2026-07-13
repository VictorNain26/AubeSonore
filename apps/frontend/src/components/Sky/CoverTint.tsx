import { useEffect, useState } from 'react';
import { useNowPlayingStore, isDefaultArtwork } from '../../lib/azuracast';

// Blurred cover tint over the generative sky. Reads the now-playing cover,
// preloads the image off-render, downscales it through an offscreen canvas
// to keep the paint cheap, and only paints once that succeeds — the preload
// is the reason this lives in JS rather than in pure CSS: without it we
// would see a flash of broken / oversized image on every track flip.
// Renders nothing when the cover is the AzuraCast default or fails to load.

function downscale(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, 64, 64);
  try {
    return canvas.toDataURL();
  } catch {
    return img.src;
  }
}

export function CoverTint() {
  const artUrl = useNowPlayingStore((s) => s.data?.now_playing?.song.art);
  const isDefaultCover = isDefaultArtwork(artUrl);

  const [preloaded, setPreloaded] = useState<{ forUrl: string; art: string } | null>(null);

  useEffect(() => {
    if (isDefaultCover || !artUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = artUrl;
    img.onload = () => setPreloaded({ forUrl: artUrl, art: downscale(img) });
    img.onerror = () => setPreloaded(null);
  }, [artUrl, isDefaultCover]);

  // Derived: paint only when the preloaded result matches the current
  // artUrl, so an in-flight load of the *previous* cover never flashes
  // against the new track. Default/missing covers never paint.
  const loadedArt =
    !isDefaultCover && artUrl && preloaded?.forUrl === artUrl ? preloaded.art : null;

  if (!loadedArt) return null;

  return (
    <img
      key={loadedArt}
      src={loadedArt}
      alt=""
      aria-hidden="true"
      className="fixed inset-0 w-full h-full object-cover scale-150 blur-[40px] opacity-25 mix-blend-soft-light pointer-events-none transition-opacity duration-1000"
    />
  );
}
