import { LruCache } from '@aubesonore/core/lru-cache';
import { API_BASE_URL } from '../utils/config';
import type { ArtistInfo } from '@aubesonore/shared-types/client';

export type { ArtistInfo } from '@aubesonore/shared-types/client';

interface CachedArtistInfo {
  data: ArtistInfo;
  expiresAt: number;
}

const ARTIST_INFO_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new LruCache<string, CachedArtistInfo>(100);

export function getCachedArtistInfo(name: string): ArtistInfo | undefined {
  const entry = cache.get(name.toLowerCase());
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) return undefined;
  return entry.data;
}

export async function getArtistInfo(
  name: string,
  signal?: AbortSignal
): Promise<ArtistInfo | null> {
  const cached = getCachedArtistInfo(name);
  if (cached) return cached;

  try {
    const res = await fetch(`${API_BASE_URL}/api/artist?name=${encodeURIComponent(name)}`, {
      signal: signal ?? null,
    });
    if (!res.ok) return null;
    const info = (await res.json()) as ArtistInfo | null;
    if (info && typeof info === 'object' && !('error' in info && info.error)) {
      cache.set(name.toLowerCase(), { data: info, expiresAt: Date.now() + ARTIST_INFO_TTL_MS });
      return info;
    }
    return null;
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      console.warn('[artistInfo] Fetch error:', err.message);
    }
    return null;
  }
}
