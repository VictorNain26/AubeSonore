import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { API_BASE_URL } from '../utils/config';

/** The page path of an artist, in the current language (`/artist/…` or `/en/artist/…`). */
export function artistPath(page: { id: string; slug: string }): string {
  return localizeHref(`/artist/${page.id}/${page.slug}`);
}

/** The profile in the page language: its summary is the Wikipedia article in that language. */
export async function fetchArtistProfile(
  id: string,
  signal?: AbortSignal
): Promise<ArtistProfile | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/artist/${encodeURIComponent(id)}?lang=${getLocale()}`,
    { signal: signal ?? null }
  );
  // 400: a malformed id, from a truncated link — as unknown as a 404.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as ArtistProfile;
}

/**
 * The page of an artist heard on the antenna, from the raw AzuraCast string.
 * `null` when the artist has no page (yet): callers show no link then.
 */
export async function resolveArtistPage(
  name: string,
  signal?: AbortSignal
): Promise<{ id: string; slug: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const response = await fetch(
    `${API_BASE_URL}/api/artist/resolve?name=${encodeURIComponent(trimmed)}`,
    { signal: signal ?? null }
  );
  if (!response.ok) return null;
  return (await response.json()) as { id: string; slug: string };
}
