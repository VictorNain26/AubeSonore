import { useState, useEffect } from 'react';
import type { SongEntry } from '@aubesonore/shared-types/azuracast';
import { AZURACAST_HISTORY_URL } from '../utils/config';

export function useStationHistory(enabled: boolean) {
  const [tracks, setTracks] = useState<SongEntry[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetch(`${AZURACAST_HISTORY_URL}?rows=50&per_page=50`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SongEntry[]>;
      })
      .then((data) => {
        setTracks(Array.isArray(data) ? data : []);
        setDone(true);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Erreur réseau');
        setDone(true);
      });

    return () => controller.abort();
  }, [enabled]);

  // isLoading is derived: true while enabled but fetch hasn't resolved yet
  return { tracks, isLoading: enabled && !done, error };
}
