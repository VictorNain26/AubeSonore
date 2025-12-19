import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate';
import { likeTrackSchema } from '../validators/trackValidator';
import * as trackService from '../services/trackService';
import { auth } from '../lib/auth/index';
import type { User, Session, LikedTrack } from '../db/schema';

interface ServiceResponse<T = LikedTrack> {
  message?: string;
  track?: T | undefined;
  status?: number;
  error?: string;
}

function hasError(data: unknown): data is { error: string } {
  return data !== null && typeof data === 'object' && 'error' in data;
}

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  // Helper to get session
  .derive(async ({ request: { headers } }): Promise<{ user?: User; session?: Session }> => {
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData) {
      return {};
    }
    return { user: sessionData.user as User, session: sessionData.session as Session };
  })

  // ✅ Liker un morceau
  .post(
    '/like',
    async ({ user, body, set }): Promise<ServiceResponse> => {
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const data = validateBody(likeTrackSchema, body);
      if (hasError(data)) {
        return data;
      }

      return trackService.likeTrack({ user, body: data });
    },
  )

  // ✅ Récupérer les morceaux likés
  .get('/like', async ({ user, set }): Promise<LikedTrack[] | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    return trackService.getLikedTracks({ user });
  })

  // ✅ Supprimer un morceau liké
  .delete('/like/:trackId', async ({ user, params, set }): Promise<ServiceResponse> => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { trackId } = params;
    if (!trackId || typeof trackId !== 'string') {
      return { status: 400, error: 'ID invalide' };
    }

    return trackService.unlikeTrack({ user, id: trackId });
  });
