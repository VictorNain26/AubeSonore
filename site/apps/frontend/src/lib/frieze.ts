import type { FriezeArtist } from '@aubesonore/shared-types/client';
import { API_BASE_URL } from '../utils/config';

/** An artist as musilogy knows it, by MBID: card, links, lineage, contemporaries. */
export async function fetchFriezeArtist(
  mbid: string,
  signal?: AbortSignal
): Promise<FriezeArtist | null> {
  const response = await fetch(`${API_BASE_URL}/api/frieze/artist/${encodeURIComponent(mbid)}`, {
    signal: signal ?? null,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as FriezeArtist;
}
