import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { artist } from '../db/schema';
import { normalize } from '../lib/text/matchScore';
import { searchArtist } from './deezerService';

// Only explicit featuring markers. Splitting on `&`, `+`, `x` or `,` would
// destroy legitimate names ("Simon & Garfunkel", "Earth, Wind & Fire").
const FEATURING_SEPARATOR = /\s+(?:feat\.?|ft\.?|featuring)\s+/i;

export function primaryArtistName(raw: string): string {
  return (raw.split(FEATURING_SEPARATOR)[0] ?? raw).trim();
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function resolveArtist(rawName: string): Promise<{ id: string; slug: string } | null> {
  const primary = primaryArtistName(rawName);
  const normalizedName = normalize(primary);
  if (!normalizedName) return null;

  const existing = await db
    .select({ id: artist.id, slug: artist.slug })
    .from(artist)
    .where(eq(artist.normalizedName, normalizedName))
    .limit(1);
  if (existing[0]) return existing[0];

  const match = await searchArtist(primary);
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

  // Lost the insert race against a concurrent resolution — read the winner.
  const winner = await db
    .select({ id: artist.id, slug: artist.slug })
    .from(artist)
    .where(eq(artist.normalizedName, normalizedName))
    .limit(1);
  return winner[0] ?? null;
}
