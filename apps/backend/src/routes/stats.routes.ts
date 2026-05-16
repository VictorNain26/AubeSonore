import { Elysia } from 'elysia';
import * as statsService from '../services/statsService';
import { auth } from '../lib/auth/index';
import type { User, Session } from '../db/schema';
import type { StatsState } from '@aubesonore/shared-types/stats';

export const statsRoutes = new Elysia({ prefix: '/api/stats' })
  .derive(async ({ request: { headers } }): Promise<{ user?: User; session?: Session }> => {
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData) return {};
    return { user: sessionData.user as User, session: sessionData.session as Session };
  })

  .get('/', async ({ user, set }): Promise<StatsState | null | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }
    return statsService.getUserStats({ user });
  })

  .put('/', async ({ user, body, set }): Promise<{ message: string } | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const snapshot = body as StatsState;
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      !Array.isArray(snapshot.events)
    ) {
      set.status = 400;
      return { error: 'Snapshot invalide' };
    }

    await statsService.upsertUserStats({ user, snapshot });
    return { message: 'Statistiques sauvegardées' };
  });
