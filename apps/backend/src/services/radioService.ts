import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';

const HISTORY_CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

export const radioHistoryCache = new TtlCache<unknown[]>(HISTORY_CACHE_TTL_MS);

/**
 * `rows` is caller-clamped (route layer) before reaching here — it is the
 * only piece of caller input interpolated into the AzuraCast URL.
 */
export async function getStationHistory(rows: number): Promise<unknown[]> {
  const cacheKey = String(rows);
  const cached = radioHistoryCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const url = `${env.AZURACAST_BASE_URL}/api/station/${env.AZURACAST_STATION_ID}/history?rows=${rows}&per_page=${rows}`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': env.AZURACAST_API_KEY },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`AzuraCast history error: ${response.status}`);
  }

  const data = (await response.json()) as unknown[];
  radioHistoryCache.set(cacheKey, data);
  return data;
}
