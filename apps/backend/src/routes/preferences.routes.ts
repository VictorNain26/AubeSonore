import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate';
import { updatePreferencesSchema } from '../validators/preferencesValidator';
import * as preferencesService from '../services/preferencesService';
import { auth } from '../lib/auth/index';
import type { User, Session, UserPreferences, PreferredPlatform } from '../db/schema';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ServiceResponse<T = UserPreferences> {
  message?: string;
  preferences?: T;
  status?: number;
  error?: string;
}

function hasError(data: unknown): data is { error: string } {
  return data !== null && typeof data === 'object' && 'error' in data;
}

// ─────────────────────────────────────────────
// Routes /api/preferences
// ─────────────────────────────────────────────

export const preferencesRoutes = new Elysia({ prefix: '/api/preferences' })
  // Helper pour récupérer la session
  .derive(async ({ request: { headers } }): Promise<{ user?: User; session?: Session }> => {
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData) {
      return {};
    }
    return { user: sessionData.user as User, session: sessionData.session as Session };
  })

  // ─────────────────────────────────────────────
  // GET /api/preferences - Récupérer les préférences
  // ─────────────────────────────────────────────
  .get('/', async ({ user, set }): Promise<UserPreferences | { error: string }> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }
    return preferencesService.getUserPreferences({ user });
  })

  // ─────────────────────────────────────────────
  // PUT /api/preferences - Mettre à jour les préférences
  // ─────────────────────────────────────────────
  .put('/', async ({ user, body, set }): Promise<ServiceResponse> => {
    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    const data = validateBody(updatePreferencesSchema, body);
    if (hasError(data)) {
      set.status = 400;
      return data;
    }

    const result = await preferencesService.updateUserPreferences({
      user,
      preferredPlatform: data.preferredPlatform as PreferredPlatform,
    });

    if (result.error) {
      set.status = result.status || 400;
    }
    return result;
  });
