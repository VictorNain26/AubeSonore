import { sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { isPushEnabled, sendToUsers } from './pushService';

export interface NowPlayingTrack {
  sh_id: number;
  title: string;
  artist: string;
}

export interface WatcherDeps {
  fetchNowPlaying: () => Promise<NowPlayingTrack | null>;
  findUserIdsByArtist: (artistLower: string) => Promise<string[]>;
  send: (userIds: string[], title: string, body: string, url: string) => Promise<unknown>;
  now?: () => number;
}

// In-memory dedupe is deliberately P0 (single replica). The Redis migration
// path is already documented in AGENTS.md if we ever scale horizontally.
const DEDUPE_MS = 12 * 60 * 60 * 1000;

export function createLikedArtistNotifier(deps: WatcherDeps): () => Promise<void> {
  const now = deps.now ?? Date.now;
  let lastShId: number | null = null;
  const lastNotified = new Map<string, number>();

  return async function check(): Promise<void> {
    const track = await deps.fetchNowPlaying();
    if (!track || track.sh_id === lastShId) return;
    lastShId = track.sh_id;

    const artistLower = track.artist.trim().toLowerCase();
    if (!artistLower) return;

    const userIds = await deps.findUserIdsByArtist(artistLower);
    const cutoff = now() - DEDUPE_MS;
    const toNotify = userIds.filter((userId) => {
      const last = lastNotified.get(`${userId}:${artistLower}`);
      return last === undefined || last < cutoff;
    });
    if (toNotify.length === 0) return;

    await deps.send(
      toNotify,
      'En ce moment sur AubeSonore',
      `« ${track.title} » — ${track.artist}, un artiste de votre bibliothèque, passe en direct.`,
      '/'
    );

    const notifiedAt = now();
    for (const userId of toNotify) {
      lastNotified.set(`${userId}:${artistLower}`, notifiedAt);
    }
    for (const [key, ts] of lastNotified) {
      if (ts < cutoff) lastNotified.delete(key);
    }
  };
}

const NOWPLAYING_TIMEOUT_MS = 10_000;

async function fetchNowPlaying(): Promise<NowPlayingTrack | null> {
  const url = `${env.AZURACAST_BASE_URL}/api/station/${env.AZURACAST_STATION_ID}/nowplaying`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': env.AZURACAST_API_KEY },
    signal: AbortSignal.timeout(NOWPLAYING_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`AzuraCast nowplaying error: ${response.status}`);
  }

  const payload: unknown = await response.json();
  const nowPlaying =
    Array.isArray(payload) && payload.length > 0
      ? (payload[0] as { now_playing?: unknown }).now_playing
      : undefined;
  if (typeof nowPlaying !== 'object' || nowPlaying === null) return null;

  const { sh_id, song } = nowPlaying as { sh_id?: unknown; song?: unknown };
  if (typeof sh_id !== 'number' || typeof song !== 'object' || song === null) return null;

  const { title, artist } = song as { title?: unknown; artist?: unknown };
  if (typeof title !== 'string' || typeof artist !== 'string') return null;

  return { sh_id, title, artist };
}

async function findUserIdsByArtist(artistLower: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: schema.likedTracks.userId })
    .from(schema.likedTracks)
    .where(sql`lower(${schema.likedTracks.artist}) = ${artistLower}`);
  return rows.map((row) => row.userId);
}

export function startLikedArtistWatcher(intervalMs = 60_000): () => void {
  if (!isPushEnabled()) {
    logger.info('liked artist watcher disabled: VAPID keys not configured');
    return () => {};
  }

  const check = createLikedArtistNotifier({
    fetchNowPlaying,
    findUserIdsByArtist,
    send: (userIds, title, body, url) => sendToUsers(userIds, title, body, url),
  });

  const timer = setInterval(() => {
    check().catch((err: unknown) => {
      logger.warn('liked artist watcher tick failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }, intervalMs);
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as { unref: () => void }).unref();
  }

  return () => clearInterval(timer);
}
