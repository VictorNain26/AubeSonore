import { useEffect, useMemo, useState } from 'react';
import { array, safeParse } from 'valibot';
import { SongEntrySchema, useNowPlayingStore, type SongEntry } from '../lib/azuracast';
import { isToday } from '../home/time';
import { API_BASE_URL } from '../utils/config';

const HistoryResponseSchema = array(SongEntrySchema);

// 400 rows cover about 25 hours of antenna, so the whole day is always there.
const HISTORY_ROWS = 400;

/**
 * Every track played today, newest first, with the track on air at the top.
 * The day's history is fetched once; the live payload keeps the top fresh.
 */
export function useTodayHistory(): {
  entries: SongEntry[];
  isLoading: boolean;
  error: string | null;
} {
  const nowPlaying = useNowPlayingStore((s) => s.data?.now_playing);
  const liveHistory = useNowPlayingStore((s) => s.data?.song_history);
  const [fetched, setFetched] = useState<SongEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/api/radio/history?rows=${HISTORY_ROWS}`, {
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
        setError(err instanceof Error ? err.message : 'network error');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const entries = useMemo(() => {
    const seen = new Set<number>();
    return [...(nowPlaying ? [nowPlaying] : []), ...(liveHistory ?? []), ...fetched]
      .filter((e) => {
        if (seen.has(e.sh_id) || !isToday(e.played_at)) return false;
        seen.add(e.sh_id);
        return true;
      })
      .sort((a, b) => b.played_at - a.played_at);
  }, [nowPlaying, liveHistory, fetched]);

  return { entries, isLoading, error };
}
