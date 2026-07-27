import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { radioPlay } from '../db/schema';
import { normalize } from '../lib/text/matchScore';
import { primaryArtistName } from './artistResolver';

export interface RadioPlay {
  title: string;
  artist: string;
  playedAt: string;
}

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function buildPlayRow(
  title: string,
  artist: string
): { id: string; title: string; artist: string; artistNormalized: string } {
  return {
    id: randomUUID(),
    title,
    artist,
    artistNormalized: normalize(primaryArtistName(artist)),
  };
}

export async function recordPlay(title: string, artist: string): Promise<void> {
  const row = buildPlayRow(title, artist);
  if (!row.artistNormalized) return;
  await db.insert(radioPlay).values(row);
}

export async function getPlaysByArtist(normalizedName: string, limit = 20): Promise<RadioPlay[]> {
  const since = new Date(Date.now() - RETENTION_MS);
  const rows = await db
    .select({ title: radioPlay.title, artist: radioPlay.artist, playedAt: radioPlay.playedAt })
    .from(radioPlay)
    .where(and(eq(radioPlay.artistNormalized, normalizedName), gte(radioPlay.playedAt, since)))
    .orderBy(desc(radioPlay.playedAt))
    .limit(limit);

  return rows.map((row) => ({
    title: row.title,
    artist: row.artist,
    playedAt: row.playedAt.toISOString(),
  }));
}
