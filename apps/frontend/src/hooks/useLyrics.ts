import { useEffect, useState, useRef } from 'react';
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

    // Check sessionStorage cache
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
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
      // Cache miss or parse error
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setSyncedLines(null);
    setPlainLyrics(null);

    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;

        const synced = data?.syncedLyrics || null;
        const plain = data?.plainLyrics || null;

        if (synced) {
          setSyncedLines(parseLRC(synced));
        }
        setPlainLyrics(plain);

        // Cache result
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ synced, plain }));
        } catch {
          // Storage full
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[useLyrics] Fetch error:', err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
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
