import { useEffect, useMemo, useState } from 'react';
import { array, safeParse } from 'valibot';
import { SongEntrySchema, useNowPlayingStore, type SongEntry } from '../lib/azuracast';
import { dedupeBySongId } from '../lib/dayTimeline';
import { AZURACAST_HISTORY_URL } from '../utils/config';

const HistoryResponseSchema = array(SongEntrySchema);
const DAY_SECONDS = 24 * 60 * 60;

export function useDayHistory(): {
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

    fetch(`${AZURACAST_HISTORY_URL}?rows=120&per_page=120`, {
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

  const entries = useMemo(() => {
    const all = dedupeBySongId([...(liveSongHistory ?? []), ...fetched]);
    if (all.length === 0) return all;
    const newest = Math.max(...all.map((e) => e.played_at));
    const cutoff = newest - DAY_SECONDS;
    return all.filter((e) => e.played_at >= cutoff);
  }, [liveSongHistory, fetched]);

  return { entries, isLoading, error };
}
