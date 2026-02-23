import { useEffect, useState, useRef } from 'react';
import { ENV } from '../config/env';

export interface ArtistInfo {
  bio: string;
  tags: string[];
  similarArtists: string[];
  listeners: number;
}

const cache = new Map<string, ArtistInfo>();

export function useArtistInfo(artistName: string | undefined) {
  const [data, setData] = useState<ArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!artistName) {
      setData(null);
      return;
    }

    const key = artistName.toLowerCase();

    // Check in-memory cache
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      return;
    }

    // Debounce 300ms
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
          return res.json();
        })
        .then((info) => {
          if (controller.signal.aborted) return;
          if (info && !info.error) {
            cache.set(key, info);
            setData(info);
          } else {
            setData(null);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.warn('[useArtistInfo] Fetch error:', err);
            setData(null);
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
