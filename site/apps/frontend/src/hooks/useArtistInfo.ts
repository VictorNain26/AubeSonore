import { useEffect, useState, useRef } from 'react';
import { getArtistInfo, getCachedArtistInfo } from '../lib/artistInfo';
import type { ArtistInfo } from '../lib/artistInfo';

export type { ArtistInfo } from '../lib/artistInfo';

// 24h TTL cache lives in lib/artistInfo. The previous 300ms debounce has
// been removed: artistName only changes on track flips (every few minutes),
// so the delay only added dead time. A 0ms setTimeout still defers state
// mutations off the effect's synchronous body so React isn't asked to
// cascade renders.

export function useArtistInfo(artistName: string | undefined) {
  const cached = artistName ? getCachedArtistInfo(artistName) : undefined;
  const [fetchedData, setFetchedData] = useState<ArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const data = cached ?? (artistName ? fetchedData : null);

  useEffect(() => {
    if (!artistName) return;
    if (getCachedArtistInfo(artistName)) return;

    clearTimeout(scheduleRef.current);
    scheduleRef.current = setTimeout(() => {
      // Drop the previous artist's data immediately — otherwise the cache miss
      // path renders `fetchedData` (which still holds the prior artist's bio)
      // for one frame before the new fetch resolves, causing a flicker.
      setFetchedData(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      void getArtistInfo(artistName, controller.signal)
        .then((info) => {
          if (controller.signal.aborted) return;
          setFetchedData(info);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      clearTimeout(scheduleRef.current);
      abortRef.current?.abort();
    };
  }, [artistName]);

  return { data, isLoading };
}
