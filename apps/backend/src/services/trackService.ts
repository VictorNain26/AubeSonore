import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { User, LikedTrack } from '../db/schema';

interface TrackBody {
  title: string;
  artist: string;
  artwork: string;
  youtubeUrl: string;
}

interface ServiceResponse<T = LikedTrack> {
  message?: string;
  track?: T | undefined;
  status?: number;
  error?: string;
}

// ✅ Like un morceau
export async function likeTrack({ user, body }: { user: User; body: TrackBody }): Promise<ServiceResponse> {
  const { title, artist, artwork, youtubeUrl } = body;

  // Vérifie si le morceau est déjà liké
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
    .then((res: any[]) => res[0]);

  if (existingTrack) {
    return { status: 400, error: 'Déjà liké' };
  }

  // Like le morceau
  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({
      id: randomUUID(),
      userId: user.id,
      title,
      artist,
      artwork,
      youtubeUrl,
    })
    .returning();

  return {
    message: 'Morceau liké avec succès',
    track: likedTrack,
  };
}

// ✅ Récupérer les morceaux likés par l'utilisateur
export async function getLikedTracks({ user }: { user: User }): Promise<LikedTrack[]> {
  const tracks = await db
    .select()
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id));

  return tracks;
}

// ✅ Supprimer un morceau liké
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
