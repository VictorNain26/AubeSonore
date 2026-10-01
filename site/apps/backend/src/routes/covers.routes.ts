import { Elysia } from 'elysia';
import { getCover } from '../services/coverService';

const SHA256 = /^[0-9a-f]{64}$/;

export const coversRoutes = new Elysia({ prefix: '/api/covers' }).get(
  '/:sha256',
  async ({ params, set }) => {
    const cover = SHA256.test(params.sha256) ? await getCover(params.sha256) : null;
    if (!cover) {
      set.status = 404;
      return { error: 'Pochette introuvable' };
    }

    set.headers['content-type'] = cover.contentType;
    // The address is the hash of the bytes: it can never serve anything else.
    set.headers['cache-control'] = 'public, max-age=31536000, immutable';
    return new Blob([cover.bytes], { type: cover.contentType });
  }
);
