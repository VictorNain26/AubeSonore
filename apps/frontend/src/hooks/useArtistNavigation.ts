import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { resolveArtistPath } from '../lib/artistProfile';

/**
 * Sends the listener to an artist page from a raw now-playing string.
 *
 * Resolution is a round trip, so callers get a promise; an unresolvable artist
 * leaves the user where they are rather than landing on an empty page.
 */
export function useArtistNavigation(): (name: string) => Promise<void> {
  const navigate = useNavigate();

  return useCallback(
    async (name: string) => {
      const path = await resolveArtistPath(name);
      if (path) await navigate(path);
    },
    [navigate]
  );
}
