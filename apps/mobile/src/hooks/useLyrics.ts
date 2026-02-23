import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseLRC, type LyricLine } from '../lib/lrcParser';

interface LyricsResult {
  syncedLines: LyricLine[] | null;
  plainLyrics: string | null;
  isLoading: boolean;
  hasSynced: boolean;
}

const CACHE_PREFIX = 'aubesonore_lyrics_';

function getCacheKey(artist: string, title: string): string {
  return `${CACHE_PREFIX}${artist.toLowerCase()}_${title.toLowerCase()}`;
}

export function useLyrics(artist: string | undefined, title: string | undefined): LyricsResult {
  const [syncedLines, setSyncedLines] = useState<LyricLine[] | null>(null);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!artist || !title) {
      setSyncedLines(null);
      setPlainLyrics(null);
      return;
    }

    const cacheKey = getCacheKey(artist, title);

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    async function fetchLyrics() {
      // Check AsyncStorage cache first
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cancelled) {
          const data = JSON.parse(cached);
          if (data.synced) {
            setSyncedLines(parseLRC(data.synced));
          } else {
            setSyncedLines(null);
          }
          setPlainLyrics(data.plain || null);
          return;
        }
      } catch {
        // Cache miss
      }

      if (cancelled) return;
      setIsLoading(true);
      setSyncedLines(null);
      setPlainLyrics(null);

      try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist!)}&track_name=${encodeURIComponent(title!)}`;
        const res = await fetch(url, { signal: controller.signal });

        if (cancelled) return;

        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const synced = data?.syncedLyrics || null;
        const plain = data?.plainLyrics || null;

        if (synced) {
          setSyncedLines(parseLRC(synced));
        }
        setPlainLyrics(plain);

        // Cache result
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ synced, plain }));
        } catch {
          // Storage full — ignore
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('[useLyrics] Fetch error:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchLyrics();

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
