import { Elysia } from 'elysia';
import { getArtistInfo } from '../services/lastfmService';
import { checkRate, getClientIp } from '../lib/rateLimit';

const ARTIST_LIMIT = 10;
const ARTIST_WINDOW_MS = 60_000;

export const artistRoutes = new Elysia({ prefix: '/api/artist' }).get(
  '/',
  async ({ request, query, set }) => {
    const ip = getClientIp(request.headers);
    if (!checkRate('artist', ip, ARTIST_LIMIT, ARTIST_WINDOW_MS)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return { error: 'Trop de requêtes, réessayez dans 1 minute' };
    }

    const name = query?.name;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      set.status = 400;
      return { error: 'Paramètre "name" requis' };
    }

    const info = await getArtistInfo(name.trim());
    if (!info) {
      set.status = 404;
      return { error: 'Artiste non trouvé' };
    }

    return info;
  }
);
