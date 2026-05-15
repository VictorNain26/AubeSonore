import { useEffect, useState, useRef } from 'react';
import { LruCache } from '@aubesonore/core/lru-cache';
import { API_BASE_URL } from '../utils/config';
import type { ArtistInfo } from '@aubesonore/shared-types/client';

export type { ArtistInfo } from '@aubesonore/shared-types/client';

// 24h TTL cache. The previous 300ms debounce has been removed: artistName
// only changes on track flips (every few minutes), so the delay only added
// dead time. A 0ms setTimeout still defers state mutations off the effect's
// synchronous body so React isn't asked to cascade renders.

interface CachedArtistInfo {
  data: ArtistInfo;
  expiresAt: number;
}

const ARTIST_INFO_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new LruCache<string, CachedArtistInfo>(100);

function readCache(key: string): ArtistInfo | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) return undefined;
  return entry.data;
}

function writeCache(key: string, data: ArtistInfo): void {
  cache.set(key, { data, expiresAt: Date.now() + ARTIST_INFO_TTL_MS });
}

export function useArtistInfo(artistName: string | undefined) {
  const cached = artistName ? readCache(artistName.toLowerCase()) : undefined;
  const [fetchedData, setFetchedData] = useState<ArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const data = cached ?? (artistName ? fetchedData : null);

  useEffect(() => {
    if (!artistName) return;
    const key = artistName.toLowerCase();
    if (readCache(key)) return;

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

      fetch(`${API_BASE_URL}/api/artist?name=${encodeURIComponent(artistName)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) return null;
          return res.json() as Promise<ArtistInfo | null>;
        })
        .then((info) => {
          if (controller.signal.aborted) return;
          if (info && typeof info === 'object' && !('error' in info && info.error)) {
            writeCache(key, info);
            setFetchedData(info);
          } else {
            setFetchedData(null);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.warn('[useArtistInfo] Fetch error:', err.message);
            setFetchedData(null);
          }
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
