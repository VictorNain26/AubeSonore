import { Elysia } from 'elysia';
import { getFriezeArtist, getFriezeOverview, getFriezeWindow } from '../services/friezeService';
import { checkRate, getClientIp } from '../lib/rateLimit';
import { parseArtistQuery, parseMbid, parseWindowQuery } from '../validators/friezeValidator';

const WINDOW_MS = 60_000;
// The frieze asks one window per genre on screen for its labels: that route
// gets the widest budget.
const LIMITS = { overview: 30, window: 300, artist: 60 } as const;

function limited(bucket: keyof typeof LIMITS, request: Request): boolean {
  return !checkRate(`frieze:${bucket}`, getClientIp(request.headers), LIMITS[bucket], WINDOW_MS);
}

const TOO_MANY = { error: 'Trop de requêtes, réessayez dans 1 minute' };

export const friezeRoutes = new Elysia({ prefix: '/api/frieze' })
  .get('/overview', ({ request, set }) => {
    if (limited('overview', request)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return TOO_MANY;
    }
    return getFriezeOverview();
  })
  .get('/window', ({ request, query, set }) => {
    if (limited('window', request)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return TOO_MANY;
    }
    const parsed = parseWindowQuery(query);
    if (!parsed.ok) {
      set.status = 400;
      return { error: parsed.error };
    }
    return getFriezeWindow(parsed.value);
  })
  .get('/artist/:mbid', async ({ request, params, query, set }) => {
    if (limited('artist', request)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return TOO_MANY;
    }
    const mbid = parseMbid(params.mbid);
    if (!mbid.ok) {
      set.status = 400;
      return { error: mbid.error };
    }
    const options = parseArtistQuery(query);
    if (!options.ok) {
      set.status = 400;
      return { error: options.error };
    }
    const found = await getFriezeArtist(mbid.value, options.value.contemporaries);
    if (!found) {
      set.status = 404;
      return { error: 'Artiste inconnu' };
    }
    return found;
  });
