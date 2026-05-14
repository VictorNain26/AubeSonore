import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { User, LikedTrack, PlatformLinks } from '../db/schema';
import { searchSonglink } from './songlinkService';
import { downloadImageAsBase64 } from './imageService';

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

  // Vérifie si le morceau est déjà liké (par titre + artiste)
  const existingTrack = await db
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
    .then((res: LikedTrack[]) => res[0]);

  if (existingTrack) {
    return { status: 400, error: 'Morceau déjà liké' };
  }

  const trackId = randomUUID();

  // 🚀 FAST INSERT - Données minimales, réponse immédiate
  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({
      id: trackId,
      userId: user.id,
      title,
      artist,
      album: album || null,
      artworkUrl: artworkUrl || null,
      artworkBase64: null, // Enrichi en background
      youtubeUrl,
      isrc: isrc || null,
      songlinkUrl: null, // Enrichi en background
      platformLinks: null, // Enrichi en background
    })
    .returning();

  if (!likedTrack) {
    return { status: 500, error: 'Failed to like track' };
  }

  // 🔄 BACKGROUND ENRICHMENT - Non-bloquant
  enrichTrackInBackground(trackId, title, artist, artworkUrl).catch((err) => {
    console.error(`[enrichTrackInBackground] Error for track ${trackId}:`, err);
  });

  return {
    message: 'Morceau liké avec succès',
    track: likedTrack,
  };
}

// ─────────────────────────────────────────────
// Enrichissement asynchrone (non-bloquant)
// ─────────────────────────────────────────────

async function enrichTrackInBackground(
  trackId: string,
  title: string,
  artist: string,
  artworkUrl: string | undefined
): Promise<void> {
  const updates: Partial<{
    artworkBase64: string;
    songlinkUrl: string;
    platformLinks: PlatformLinks;
  }> = {};

  // Télécharger la cover et récupérer les liens en parallèle
  const [imageResult, songlinkData] = await Promise.all([
    artworkUrl ? downloadImageAsBase64(artworkUrl) : Promise.resolve(null),
    searchSonglink(title, artist),
  ]);

  if (imageResult?.base64) {
    updates.artworkBase64 = imageResult.base64;
  }

  if (songlinkData) {
    updates.songlinkUrl = songlinkData.pageUrl;
    updates.platformLinks = songlinkData.platformLinks;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(schema.likedTracks).set(updates).where(eq(schema.likedTracks.id, trackId));
    console.log(`[enrichTrackInBackground] Track ${trackId} enriched with:`, Object.keys(updates));
  }
}

// ─────────────────────────────────────────────
// Récupérer les morceaux likés (projection sans artworkBase64 pour alléger le payload)
// ─────────────────────────────────────────────

export type LikedTrackListItem = Omit<LikedTrack, 'artworkBase64'>;

export async function getLikedTracks({ user }: { user: User }): Promise<LikedTrackListItem[]> {
  const tracks = await db
    .select({
      id: schema.likedTracks.id,
      title: schema.likedTracks.title,
      artist: schema.likedTracks.artist,
      album: schema.likedTracks.album,
      artworkUrl: schema.likedTracks.artworkUrl,
      youtubeUrl: schema.likedTracks.youtubeUrl,
      isrc: schema.likedTracks.isrc,
      songlinkUrl: schema.likedTracks.songlinkUrl,
      platformLinks: schema.likedTracks.platformLinks,
      createdAt: schema.likedTracks.createdAt,
      userId: schema.likedTracks.userId,
    })
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id))
    .orderBy(schema.likedTracks.createdAt);

  return tracks;
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
