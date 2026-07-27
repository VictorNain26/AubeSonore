import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { artist } from '../db/schema';
import { logger } from '../lib/logger';
import { getArtist, getRelatedArtists, getTopTracks } from './deezerService';
import { getArtistInfo } from './lastfmService';
import { getArtistLinks } from './musicbrainzService';
import { getPlaysByArtist } from './radioPlayService';

const SOURCE_TIMEOUT_MS = 6_000;

// A slow source degrades its own section only; the profile still answers.
async function withFallback<V>(label: string, work: Promise<V>, fallback: V): Promise<V> {
  try {
    return await Promise.race([
      work,
      new Promise<V>((_, reject) =>
        setTimeout(() => reject(new Error('source timeout')), SOURCE_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    logger.warn('artistProfile.source_failed', { label, message: (err as Error).message });
    return fallback;
  }
}

export async function getArtistProfile(id: string): Promise<ArtistProfile | null> {
  const rows = await db
    .select({
      id: artist.id,
      displayName: artist.displayName,
      normalizedName: artist.normalizedName,
      slug: artist.slug,
      deezerId: artist.deezerId,
      mbid: artist.mbid,
    })
    .from(artist)
    .where(eq(artist.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [deezerArtist, related, topTracks, lastfm, links, playedOnRadio] = await Promise.all([
    row.deezerId ? withFallback('deezer.artist', getArtist(row.deezerId), null) : null,
    row.deezerId ? withFallback('deezer.related', getRelatedArtists(row.deezerId), []) : [],
    row.deezerId ? withFallback('deezer.top', getTopTracks(row.deezerId), []) : [],
    withFallback('lastfm', getArtistInfo(row.displayName), null),
    row.mbid ? withFallback('musicbrainz', getArtistLinks(row.mbid), []) : [],
    withFallback('radioPlay', getPlaysByArtist(row.normalizedName), []),
  ]);

  return {
    id: row.id,
    name: row.displayName,
    slug: row.slug,
    image: deezerArtist?.picture ?? null,
    bio: lastfm?.bio || null,
    tags: lastfm?.tags ?? [],
    listeners: lastfm?.listeners ?? null,
    similar: related.map((entry) => ({ id: entry.id, name: entry.name, image: entry.picture })),
    topTracks: topTracks.map((track) => ({ title: track.title, url: track.link })),
    links,
    playedOnRadio,
    resolved: row.deezerId !== null,
  };
}
