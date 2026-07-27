import { LruCache } from '@aubesonore/core/lru-cache';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { API_BASE_URL } from '../utils/config';

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new LruCache<string, { data: ArtistProfile; expiresAt: number }>(50);

export async function fetchArtistProfile(
  id: string,
  signal?: AbortSignal
): Promise<ArtistProfile | null> {
  const cached = cache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const response = await fetch(`${API_BASE_URL}/api/artist/${encodeURIComponent(id)}`, {
    signal: signal ?? null,
  });
  if (!response.ok) return null;

  const profile = (await response.json()) as ArtistProfile;
  cache.set(id, { data: profile, expiresAt: Date.now() + TTL_MS });
  return profile;
}
