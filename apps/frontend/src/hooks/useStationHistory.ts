import { useState, useEffect } from 'react';
import type { SongEntry } from '@aubesonore/shared-types/azuracast';
import { AZURACAST_HISTORY_URL } from '../utils/config';

export function useStationHistory(enabled: boolean) {
  const [tracks, setTracks] = useState<SongEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

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
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Erreur réseau');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [enabled]);

  return { tracks, isLoading, error };
}
