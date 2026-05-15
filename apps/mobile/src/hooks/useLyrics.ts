import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseLRC, type LyricLine } from '../lib/lrcParser';

interface LyricsResult {
  syncedLines: LyricLine[] | null;
  plainLyrics: string | null;
  isLoading: boolean;
  hasSynced: boolean;
}

interface LrcLibResponse {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

interface CachedLyrics {
  synced: string | null;
  plain: string | null;
}

const CACHE_PREFIX = 'aubesonore_lyrics_';

function getCacheKey(artist: string, title: string): string {
  return `${CACHE_PREFIX}${artist.toLowerCase()}_${title.toLowerCase()}`;
}

export function useLyrics(artist: string | undefined, title: string | undefined): LyricsResult {
  const [internalSyncedLines, setInternalSyncedLines] = useState<LyricLine[] | null>(null);
  const [internalPlainLyrics, setInternalPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Derive lyrics: clear if artist or title missing
  const syncedLines = artist && title ? internalSyncedLines : null;
  const plainLyrics = artist && title ? internalPlainLyrics : null;

  useEffect(() => {
    if (!artist || !title) {
      return;
    }

    const cacheKey = getCacheKey(artist, title);

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    async function fetchLyrics(): Promise<void> {
      // Check AsyncStorage cache first
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cancelled) {
          const data = JSON.parse(cached) as CachedLyrics;
          setInternalSyncedLines(data.synced ? parseLRC(data.synced) : null);
          setInternalPlainLyrics(data.plain ?? null);
          return;
        }
      } catch {
        // Cache miss
      }

      if (cancelled) return;
      setIsLoading(true);
      setInternalSyncedLines(null);
      setInternalPlainLyrics(null);

      try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist!)}&track_name=${encodeURIComponent(title!)}`;
        const res = await fetch(url, { signal: controller.signal });

        if (cancelled) return;

        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = (await res.json()) as LrcLibResponse;
        if (cancelled) return;

        const synced = data.syncedLyrics ?? null;
        const plain = data.plainLyrics ?? null;

        if (synced) {
          setInternalSyncedLines(parseLRC(synced));
        }
        setInternalPlainLyrics(plain);

        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ synced, plain }));
        } catch {
          // Storage full — ignore
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('[useLyrics] Fetch error:', err.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchLyrics();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [artist, title]);

  return {
    syncedLines,
    plainLyrics,
    isLoading,
    hasSynced: syncedLines !== null && syncedLines.length > 0,
  };
}
