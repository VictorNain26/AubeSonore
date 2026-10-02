import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { artist, radioPlay } from '../db/schema';
import { searchArtist } from './deezerService';
import { fetchNowPlaying } from './nowPlaying';

// Only explicit featuring markers. Splitting on `&`, `+`, `x` or `,` would
// destroy legitimate names ("Simon & Garfunkel", "Earth, Wind & Fire").
const FEATURING_SEPARATOR = /\s+(?:feat\.?|ft\.?|featuring)\s+/i;

export function primaryArtistName(raw: string): string {
  return (raw.split(FEATURING_SEPARATOR)[0] ?? raw).trim();
}

/**
 * The resolution key. Letters and digits of every script survive, so "坂本龍一"
 * or "Кино" get a key; accents and punctuation do not, so "Beyoncé" and
 * "beyonce" share one.
 */
export function normalizeArtistName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function slugify(name: string): string {
  return normalizeArtistName(name).replace(/ /g, '-');
}

type Resolved = { id: string; slug: string };

async function findBy(normalizedName: string): Promise<Resolved | null> {
  const rows = await db
    .select({ id: artist.id, slug: artist.slug })
    .from(artist)
    .where(eq(artist.normalizedName, normalizedName))
    .limit(1);
  return rows[0] ?? null;
}

/** Pages exist for what the antenna played, never for a name typed into the API. */
async function playedOnAntenna(normalizedName: string): Promise<boolean> {
  const rows = await db
    .select({ id: radioPlay.id })
    .from(radioPlay)
    .where(eq(radioPlay.artistNormalized, normalizedName))
    .limit(1);
  if (rows[0]) return true;

  // The watcher records a track up to a minute after it starts.
  const current = await fetchNowPlaying().catch(() => null);
  return (
    current !== null && normalizeArtistName(primaryArtistName(current.artist)) === normalizedName
  );
}

export async function resolveArtist(rawName: string): Promise<Resolved | null> {
  const primary = primaryArtistName(rawName);
  const normalizedName = normalizeArtistName(primary);
  if (!normalizedName) return null;

  const existing = await findBy(normalizedName);
  if (existing) return existing;

  if (!(await playedOnAntenna(normalizedName))) return null;

  const search = await searchArtist(primary, normalizeArtistName);
  // Deezer down: resolve again next time rather than persist a false "unknown".
  if (search.status === 'failed') return null;

  const match = search.status === 'match' ? search.artist : null;
  const displayName = match?.name ?? primary;
  const inserted = await db
    .insert(artist)
    .values({
      id: randomUUID(),
      normalizedName,
      displayName,
      slug: slugify(displayName),
      deezerId: match?.id ?? null,
      mbid: null,
    })
    .onConflictDoNothing()
    .returning({ id: artist.id, slug: artist.slug });
  if (inserted[0]) return inserted[0];

  // Lost the insert race against a concurrent resolution: read the winner. A
  // Deezer match needs an equal normalized name, so two rows never share one.
  return findBy(normalizedName);
}
