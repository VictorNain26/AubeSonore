import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { User, LikedTrack, PlatformLinks } from '../db/schema';
import { getSonglinkData } from './songlinkService';
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
// Like un morceau
// ─────────────────────────────────────────────

export async function likeTrack({ user, body }: { user: User; body: LikeTrackBody }): Promise<ServiceResponse> {
  const { title, artist, album, artworkUrl, youtubeUrl, isrc } = body;

  // Vérifie si le morceau est déjà liké (par titre + artiste)
  const existingTrack = await db
    .select()
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist),
      ),
    )
    .limit(1)
    .then((res: LikedTrack[]) => res[0]);

  if (existingTrack) {
    return { status: 400, error: 'Morceau déjà liké' };
  }

  // Télécharger la cover en base64 pour persistence
  let artworkBase64: string | null = null;
  if (artworkUrl) {
    const imageResult = await downloadImageAsBase64(artworkUrl);
    if (imageResult) {
      artworkBase64 = imageResult.base64;
    }
  }

  // Récupérer les liens multi-plateformes via Songlink
  let songlinkUrl: string | null = null;
  let platformLinks: PlatformLinks | null = null;

  const songlinkData = await getSonglinkData(youtubeUrl);
  if (songlinkData) {
    songlinkUrl = songlinkData.pageUrl;
    platformLinks = songlinkData.platformLinks;
  }

  // Insérer le morceau liké
  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({
      id: randomUUID(),
      userId: user.id,
      title,
      artist,
      album: album || null,
      artworkUrl: artworkUrl || null,
      artworkBase64,
      youtubeUrl,
      isrc: isrc || null,
      songlinkUrl,
      platformLinks,
    })
    .returning();

  if (!likedTrack) {
    return { status: 500, error: 'Failed to like track' };
  }

  return {
    message: 'Morceau liké avec succès',
    track: likedTrack,
  };
}

// ─────────────────────────────────────────────
// Récupérer les morceaux likés
// ─────────────────────────────────────────────

export async function getLikedTracks({ user }: { user: User }): Promise<LikedTrack[]> {
  const tracks = await db
    .select()
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id))
    .orderBy(schema.likedTracks.createdAt);

  return tracks;
}

// ─────────────────────────────────────────────
// Supprimer un morceau liké
// ─────────────────────────────────────────────

export async function unlikeTrack({ user, id }: { user: User; id: string }): Promise<ServiceResponse> {
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

export async function isTrackLiked({ user, title, artist }: { user: User; title: string; artist: string }): Promise<boolean> {
  const track = await db
    .select({ id: schema.likedTracks.id })
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist),
      ),
    )
    .limit(1)
    .then((res) => res[0]);

  return !!track;
}

// ─────────────────────────────────────────────
// Récupérer un morceau liké par titre/artiste
// ─────────────────────────────────────────────

export async function getLikedTrackByTitleArtist({ user, title, artist }: { user: User; title: string; artist: string }): Promise<LikedTrack | null> {
  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist),
      ),
    )
    .limit(1)
    .then((res) => res[0] || null);

  return track;
}

// ─────────────────────────────────────────────
// Mettre à jour les liens d'un morceau (refresh Songlink)
// ─────────────────────────────────────────────

export async function refreshTrackLinks({ user, id }: { user: User; id: string }): Promise<ServiceResponse> {
  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(and(eq(schema.likedTracks.userId, user.id), eq(schema.likedTracks.id, id)))
    .limit(1)
    .then((res) => res[0]);

  if (!track) {
    return { status: 404, error: 'Morceau non trouvé' };
  }

  const songlinkData = await getSonglinkData(track.youtubeUrl);
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
