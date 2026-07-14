import { useEffect, useMemo, useState } from 'react';
import { array, safeParse } from 'valibot';
import { SongEntrySchema, useNowPlayingStore, type SongEntry } from '../lib/azuracast';
import { takeRecent } from '../lib/recentTracks';
import { API_BASE_URL } from '../utils/config';

const HistoryResponseSchema = array(SongEntrySchema);

export function useRecentHistory(): {
  entries: SongEntry[];
  isLoading: boolean;
  error: string | null;
} {
  const liveSongHistory = useNowPlayingStore((s) => s.data?.song_history);
  const [fetched, setFetched] = useState<SongEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/api/radio/history?rows=24`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        const parsed = safeParse(HistoryResponseSchema, data);
        if (!parsed.success) throw new Error('invalid payload');
        setFetched(parsed.output as SongEntry[]);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Erreur réseau');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const entries = useMemo(
    () => takeRecent([...(liveSongHistory ?? []), ...fetched], 8),
    [liveSongHistory, fetched]
  );

  return { entries, isLoading, error };
}
