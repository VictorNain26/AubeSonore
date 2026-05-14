import { db, schema } from '../db/index';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { User, LikedTrack, PlatformLinks } from '../db/schema';
import { searchSonglink } from './songlinkService';

// Hard cap on the liked-tracks listing payload. Power users with thousands
// of tracks would otherwise stream the entire library on every page load.
// Pagination via cursor (?before=createdAt) is the long-term replacement.
const LIKED_TRACKS_MAX_PAGE = 500;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LikeTrackBody {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  youtubeUrl: string;
  isrc?: string;
}

interface ServiceResponse<T = LikedTrack> {
  message?: string;
  track?: T;
  status?: number;
  error?: string;
}

// ─────────────────────────────────────────────
// Like un morceau - Fast insert + background enrichment
// ─────────────────────────────────────────────

export async function likeTrack({
  user,
  body,
}: {
  user: User;
  body: LikeTrackBody;
}): Promise<ServiceResponse> {
  const { title, artist, album, artworkUrl, youtubeUrl, isrc } = body;
  const trackId = randomUUID();

  // Atomic insert relying on the unique index (user_id, title, artist).
  // Returning empty means the row already existed — single round-trip, no race.
  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({
      id: trackId,
      userId: user.id,
      title,
      artist,
      album: album || null,
      artworkUrl: artworkUrl || null,
      youtubeUrl,
      isrc: isrc || null,
      songlinkUrl: null,
      platformLinks: null,
    })
    .onConflictDoNothing({
      target: [schema.likedTracks.userId, schema.likedTracks.title, schema.likedTracks.artist],
    })
    .returning();

  if (!likedTrack) {
    return { status: 400, error: 'Morceau déjà liké' };
  }

  // Background enrichment — non-blocking Songlink lookup.
  void enrichTrackInBackground(trackId, title, artist).catch((err: unknown) => {
    console.error(`[enrichTrackInBackground] Error for track ${trackId}:`, err);
  });

  return {
    message: 'Morceau liké avec succès',
    track: likedTrack,
  };
}

async function enrichTrackInBackground(
  trackId: string,
  title: string,
  artist: string
): Promise<void> {
  const songlinkData = await searchSonglink(title, artist);
  if (!songlinkData) return;

  const updates: Partial<{ songlinkUrl: string; platformLinks: PlatformLinks }> = {
    songlinkUrl: songlinkData.pageUrl,
    platformLinks: songlinkData.platformLinks,
  };

  await db.update(schema.likedTracks).set(updates).where(eq(schema.likedTracks.id, trackId));
}

export type LikedTrackListItem = LikedTrack;

export async function getLikedTracks({ user }: { user: User }): Promise<LikedTrack[]> {
  return db
    .select()
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id))
    .orderBy(desc(schema.likedTracks.createdAt))
    .limit(LIKED_TRACKS_MAX_PAGE);
}

// ─────────────────────────────────────────────
// Supprimer un morceau liké
// ─────────────────────────────────────────────

export async function unlikeTrack({
  user,
  id,
}: {
  user: User;
  id: string;
}): Promise<ServiceResponse> {
  const [deletedTrack] = await db
    .delete(schema.likedTracks)
    .where(and(eq(schema.likedTracks.userId, user.id), eq(schema.likedTracks.id, id)))
    .returning();

  if (!deletedTrack) {
    return { status: 404, error: 'Morceau non trouvé ou déjà supprimé' };
  }

  return {
    message: 'Morceau supprimé avec succès',
    track: deletedTrack,
  };
}

// ─────────────────────────────────────────────
// Vérifier si un morceau est liké
// ─────────────────────────────────────────────

export async function isTrackLiked({
  user,
  title,
  artist,
}: {
  user: User;
  title: string;
  artist: string;
}): Promise<boolean> {
  const track = await db
    .select({ id: schema.likedTracks.id })
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist)
      )
    )
    .limit(1)
    .then((res) => res[0]);

  return !!track;
}

// ─────────────────────────────────────────────
// Récupérer un morceau liké par titre/artiste
// ─────────────────────────────────────────────

export async function getLikedTrackByTitleArtist({
  user,
  title,
  artist,
}: {
  user: User;
  title: string;
  artist: string;
}): Promise<LikedTrack | null> {
  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist)
      )
    )
    .limit(1)
    .then((res) => res[0] || null);

  return track;
}

// ─────────────────────────────────────────────
// Rafraîchir tous les liens (batch, rate-limited)
// ─────────────────────────────────────────────

const REFRESH_CHUNK_SIZE = 5;
const REFRESH_CHUNK_DELAY_MS = 500;

export async function refreshAllLinks({
  user,
}: {
  user: User;
}): Promise<{ message: string; updated: number }> {
  const tracks = await db
    .select({
      id: schema.likedTracks.id,
      title: schema.likedTracks.title,
      artist: schema.likedTracks.artist,
    })
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id));

  let updated = 0;

  for (let i = 0; i < tracks.length; i += REFRESH_CHUNK_SIZE) {
    const chunk = tracks.slice(i, i + REFRESH_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (track) => {
        const songlinkData = await searchSonglink(track.title, track.artist);
        if (!songlinkData) return false;
        await db
          .update(schema.likedTracks)
          .set({
            songlinkUrl: songlinkData.pageUrl,
            platformLinks: songlinkData.platformLinks,
          })
          .where(eq(schema.likedTracks.id, track.id));
        return true;
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) updated++;
      if (r.status === 'rejected') {
        console.error('[refreshAllLinks]', (r.reason as Error).message);
      }
    }
    if (i + REFRESH_CHUNK_SIZE < tracks.length) {
      await new Promise((resolve) => setTimeout(resolve, REFRESH_CHUNK_DELAY_MS));
    }
  }

  return { message: `${updated} liens mis à jour`, updated };
}

// ─────────────────────────────────────────────
// Mettre à jour les liens d'un morceau (refresh)
// ─────────────────────────────────────────────

export async function refreshTrackLinks({
  user,
  id,
}: {
  user: User;
  id: string;
}): Promise<ServiceResponse> {
  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(and(eq(schema.likedTracks.userId, user.id), eq(schema.likedTracks.id, id)))
    .limit(1)
    .then((res) => res[0]);

  if (!track) {
    return { status: 404, error: 'Morceau non trouvé' };
  }

  const songlinkData = await searchSonglink(track.title, track.artist);
  if (!songlinkData) {
    return { status: 400, error: 'Impossible de récupérer les liens pour ce morceau' };
  }

  const [updatedTrack] = await db
    .update(schema.likedTracks)
    .set({
      songlinkUrl: songlinkData.pageUrl,
      platformLinks: songlinkData.platformLinks,
    })
    .where(eq(schema.likedTracks.id, id))
    .returning();

  if (!updatedTrack) {
    return { status: 500, error: 'Failed to update track links' };
  }

  return {
    message: 'Liens mis à jour avec succès',
    track: updatedTrack,
  };
}
