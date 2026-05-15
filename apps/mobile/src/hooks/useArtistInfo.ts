import { useEffect, useState, useRef } from 'react';
import { LruCache } from '@aubesonore/core/lru-cache';
import { ENV } from '../config/env';
import type { ArtistInfo } from '@aubesonore/shared-types/client';

export type { ArtistInfo } from '@aubesonore/shared-types/client';

const cache = new LruCache<string, ArtistInfo>(100);

export function useArtistInfo(artistName: string | undefined) {
  // Read cache synchronously during render — avoids setState-in-effect for hits.
  const cached = artistName ? cache.get(artistName.toLowerCase()) : undefined;
  const [fetchedData, setFetchedData] = useState<ArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const data = cached ?? (artistName ? fetchedData : null);

  useEffect(() => {
    if (!artistName) return;
    const key = artistName.toLowerCase();
    if (cache.get(key)) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      fetch(`${ENV.API_BASE_URL}/api/artist?name=${encodeURIComponent(artistName)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) return null;
          return res.json() as Promise<ArtistInfo | { error: string } | null>;
        })
        .then((info) => {
          if (controller.signal.aborted) return;
          if (info && !('error' in info)) {
            cache.set(key, info);
            setFetchedData(info);
          } else {
            setFetchedData(null);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.warn('[useArtistInfo] Fetch error:', err);
            setFetchedData(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [artistName]);

  return { data, isLoading };
}
