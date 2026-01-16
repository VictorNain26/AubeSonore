import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate';
import { likeTrackSchema, checkLikedSchema } from '../validators/trackValidator';
import * as trackService from '../services/trackService';
import { auth } from '../lib/auth/index';
import type { User, Session, LikedTrack } from '../db/schema';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ServiceResponse<T = LikedTrack> {
  message?: string;
  track?: T;
  status?: number;
  error?: string;
}

function hasError(data: unknown): data is { error: string } {
  return data !== null && typeof data === 'object' && 'error' in data;
}

// ─────────────────────────────────────────────
// Routes /api/track
// ─────────────────────────────────────────────

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  // Helper pour récupérer la session
  .derive(async ({ request: { headers } }): Promise<{ user?: User; session?: Session }> => {
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData) {
      return {};
    }
    return { user: sessionData.user as User, session: sessionData.session as Session };
  })

  // ─────────────────────────────────────────────
  // POST /api/track/like - Liker un morceau
  // ─────────────────────────────────────────────
  .post(
    '/like',
    async ({ user, body, set }): Promise<ServiceResponse> => {
      if (!user) {
        set.status = 401;
        return { error: 'Non authentifié' };
      }

      const data = validateBody(likeTrackSchema, body);
      if (hasError(data)) {
        set.status = 400;
        return data;
      }

      // Build request with only defined optional fields
      const requestBody = {
        title: data.title,
        artist: data.artist,
        youtubeUrl: data.youtubeUrl,
        ...(data.album !== undefined && { album: data.album }),
        ...(data.artworkUrl !== undefined && { artworkUrl: data.artworkUrl }),
        ...(data.isrc !== undefined && { isrc: data.isrc }),
      };
      const result = await trackService.likeTrack({ user, body: requestBody });
      if (result.error) {
        set.status = result.status || 400;
      }
      return result;
    },
  )

  // ─────────────────────────────────────────────
  // GET /api/track/like - Récupérer les morceaux likés
  // ─────────────────────────────────────────────
  .get('/like', async ({ user, set }): Promise<LikedTrack[] | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }
    return trackService.getLikedTracks({ user });
  })

  // ─────────────────────────────────────────────
  // DELETE /api/track/like/:trackId - Supprimer un morceau liké
  // ─────────────────────────────────────────────
  .delete('/like/:trackId', async ({ user, params, set }): Promise<ServiceResponse> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const { trackId } = params;
    if (!trackId || typeof trackId !== 'string') {
      set.status = 400;
      return { error: 'ID invalide' };
    }

    const result = await trackService.unlikeTrack({ user, id: trackId });
    if (result.error) {
      set.status = result.status || 400;
    }
    return result;
  })

  // ─────────────────────────────────────────────
  // POST /api/track/check-liked - Vérifier si un morceau est liké
  // ─────────────────────────────────────────────
  .post('/check-liked', async ({ user, body, set }): Promise<{ liked: boolean; track?: LikedTrack } | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const data = validateBody(checkLikedSchema, body);
    if (hasError(data)) {
      set.status = 400;
      return data;
    }

    const track = await trackService.getLikedTrackByTitleArtist({
      user,
      title: data.title,
      artist: data.artist,
    });

    if (track) {
      return { liked: true, track };
    }
    return { liked: false };
  })

  // ─────────────────────────────────────────────
  // POST /api/track/:trackId/refresh-links - Rafraîchir les liens Songlink
  // ─────────────────────────────────────────────
  .post('/:trackId/refresh-links', async ({ user, params, set }): Promise<ServiceResponse> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const { trackId } = params;
    if (!trackId || typeof trackId !== 'string') {
      set.status = 400;
      return { error: 'ID invalide' };
    }

    const result = await trackService.refreshTrackLinks({ user, id: trackId });
    if (result.error) {
      set.status = result.status || 400;
    }
    return result;
  });
