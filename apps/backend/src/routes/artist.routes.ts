import { Elysia } from 'elysia';
import { getArtistInfo } from '../services/lastfmService';

export const artistRoutes = new Elysia({ prefix: '/api' }).get(
  '/artist',
  async ({ query, set }) => {
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
