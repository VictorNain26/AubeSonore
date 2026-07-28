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

/**
 * Turns the messy artist string AzuraCast gives us into the canonical page
 * path. The id is resolved server-side so the URL survives a restart.
 */
export async function resolveArtistPath(
  name: string,
  signal?: AbortSignal
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const response = await fetch(
    `${API_BASE_URL}/api/artist/resolve?name=${encodeURIComponent(trimmed)}`,
    { signal: signal ?? null }
  );
  if (!response.ok) return null;

  const { id, slug } = (await response.json()) as { id: string; slug: string };
  return `/artist/${id}/${slug}`;
}
