import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/config';

export interface TrendEntry {
  title: string;
  artist: string;
  artworkUrl: string | null;
  likes: number;
}

export interface TrendsResult {
  week: TrendEntry[];
  allTime: TrendEntry[];
}

// Fetches the community trends once per modal open — no polling: the modal
// is a transient view and the backend already caches the aggregate 5 min.
// `isLoading` is derived (not a state) so the effect never sets state
// synchronously in its body.
export function useTrends(isOpen: boolean) {
  const [data, setData] = useState<TrendsResult | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    void fetch(`${API_BASE_URL}/api/trends`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`trends ${res.status}`);
        const result = (await res.json()) as TrendsResult;
        if (controller.signal.aborted) return;
        setHasError(false);
        setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true);
      });

    return () => controller.abort();
  }, [isOpen]);

  return { data, isLoading: isOpen && data === null && !hasError, hasError };
}
