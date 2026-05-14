import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate';
import { subscribeSchema, sendPushSchema, unsubscribeSchema } from '../validators/pushValidator';
import * as pushService from '../services/pushService';
import { auth } from '../lib/auth/index';
import type { User, Session } from '../db/schema';

function hasError(data: unknown): data is { error: string } {
  return data !== null && typeof data === 'object' && 'error' in data;
}

export const pushRoutes = new Elysia({ prefix: '/api/push' })
  .derive(async ({ request: { headers } }): Promise<{ user?: User; session?: Session }> => {
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData) {
      return {};
    }
    return { user: sessionData.user as User, session: sessionData.session as Session };
  })

  // GET /api/push/vapid-key — Public
  .get('/vapid-key', ({ set }) => {
    const key = pushService.getVapidPublicKey();
    if (!key) {
      set.status = 503;
      return { error: 'Push notifications non configurées' };
    }
    return { key };
  })

  // POST /api/push/subscribe — Auth required
  .post('/subscribe', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const data = validateBody(subscribeSchema, body);
    if (hasError(data)) {
      set.status = 400;
      return data;
    }

    await pushService.subscribe(user.id, data);
    return { message: 'Souscription enregistrée' };
  })

  // DELETE /api/push/unsubscribe — Auth required
  .delete('/unsubscribe', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const data = validateBody(unsubscribeSchema, body);
    if (hasError(data)) {
      set.status = 400;
      return data;
    }

    await pushService.unsubscribe(user.id, data.endpoint);
    return { message: 'Désinscription effectuée' };
  })

  // POST /api/push/send — Admin only
  .post('/send', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    // Defense in depth: even with email verification required, double-check
    // that the admin's email is verified before granting broadcast power.
    if (user.role !== 'admin' || !user.emailVerified) {
      set.status = 403;
      return { error: 'Accès refusé' };
    }

    const data = validateBody(sendPushSchema, body);
    if (hasError(data)) {
      set.status = 400;
      return data;
    }

    const result = await pushService.sendToAll(data.title, data.body, data.url);
    return { message: `${result.sent} notifications envoyées`, ...result };
  });
