import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate';
import { likeTrackSchema } from '../validators/trackValidator';
import * as trackService from '../services/trackService';
import { auth } from '../lib/auth/index';

function hasError(data: any): data is { error: string } {
  return data && typeof data === 'object' && 'error' in data;
}

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .macro({
    auth: {
      async resolve({ error, request: { headers } }): Promise<{ user: any; session: any } | any> {
        const session = await auth.api.getSession({ headers });
        if (!session) {
          return error(401);
        }
        return { user: session.user, session: session.session };
      },
    },
  })

  // ✅ Liker un morceau
  .post(
    '/like',
    async ({ user, body }): Promise<any> => {
      const data = validateBody(likeTrackSchema, body);
      if (hasError(data)) {
        return data;
      }

      return trackService.likeTrack({ user, body: data });
    },
    {
      auth: true,
    },
  )

  // ✅ Récupérer les morceaux likés
  .get(
    '/like',
    async ({ user }): Promise<any> => trackService.getLikedTracks({ user }),
    {
      auth: true,
    },
  )

  // ✅ Supprimer un morceau liké
  .delete(
    '/like/:trackId',
    async ({ user, params }): Promise<any> => {
      const { trackId } = params;
      if (!trackId || typeof trackId !== 'string') {
        return { status: 400, error: 'ID invalide' };
      }

      return trackService.unlikeTrack({ user, id: trackId });
    },
    {
      auth: true,
    },
  );
