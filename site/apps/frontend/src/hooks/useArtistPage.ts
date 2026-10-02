import { useEffect, useState } from 'react';
import { resolveArtistPage } from '../lib/artistProfile';

/**
 * The page of an artist heard on the antenna, or `null` while it resolves or
 * when the artist has none: a link is only shown once it leads somewhere.
 */
export function useArtistPage(artist: string | undefined): { id: string; slug: string } | null {
  const [resolved, setResolved] = useState<{
    artist: string;
    page: { id: string; slug: string } | null;
  } | null>(null);

  useEffect(() => {
    if (!artist) return;
    const controller = new AbortController();
    resolveArtistPage(artist, controller.signal)
      .then((page) => setResolved({ artist, page }))
      .catch(() => {
        // Aborted by the next track, or offline: no link rather than a dead one.
      });
    return () => controller.abort();
  }, [artist]);

  // Derived, so a page resolved for the previous track never shows on this one.
  return resolved !== null && resolved.artist === artist ? resolved.page : null;
}
