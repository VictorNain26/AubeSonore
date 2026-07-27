import { Elysia } from 'elysia';
import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';
import { logger } from '../lib/logger';
import { checkRate, getClientIp } from '../lib/rateLimit';
import { getArtistProfile } from '../services/artistProfileService';
import { renderArtistShell } from '../services/templates/artistShell';
import { isValidArtistId } from '../validators/artistValidator';

// Higher than the JSON budget: this is a document route, and a single visit
// pulls one page rather than a burst of API calls.
const PAGE_LIMIT = 60;
const PAGE_WINDOW_MS = 60_000;
const SHELL_TTL_MS = 5 * 60 * 1000;
const RENDERED_TTL_MS = 60 * 60 * 1000;
const SHELL_TIMEOUT_MS = 3_000;
const SHELL_KEY = 'shell';

export const artistShellCache = new TtlCache<string>(SHELL_TTL_MS);

async function loadShell(): Promise<string | null> {
  const cached = artistShellCache.get(SHELL_KEY);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${env.FRONTEND_ORIGIN_INTERNAL}/index.html`, {
      signal: AbortSignal.timeout(SHELL_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn('artistPage.shell_unavailable', { status: response.status });
      return null;
    }
    const html = await response.text();
    artistShellCache.set(SHELL_KEY, html);
    return html;
  } catch (err) {
    logger.warn('artistPage.shell_unavailable', { message: (err as Error).message });
    return null;
  }
}

interface HandlerContext {
  request: Request;
  params: { id: string };
  set: { status?: number | string; headers: Record<string, string | number> };
}

async function handle({ request, params, set }: HandlerContext): Promise<string> {
  const ip = getClientIp(request.headers);
  if (!checkRate('artistPage', ip, PAGE_LIMIT, PAGE_WINDOW_MS)) {
    set.status = 429;
    set.headers['retry-after'] = '60';
    return 'Trop de requêtes, réessayez dans 1 minute';
  }

  if (!isValidArtistId(params.id)) {
    set.status = 400;
    return 'Identifiant invalide';
  }

  const shell = await loadShell();
  if (!shell) {
    set.status = 502;
    return 'Application indisponible';
  }

  set.headers['content-type'] = 'text/html; charset=utf-8';
  set.headers['cache-control'] = 'public, max-age=300';

  const cacheKey = `rendered:${params.id}`;
  const rendered = artistShellCache.get(cacheKey);
  if (rendered !== undefined) return rendered;

  const profile = await getArtistProfile(params.id);
  // Unknown artist: the SPA still boots and renders its own not-found state.
  if (!profile) return shell;

  const pageUrl = `${env.FRONTEND_BASE_URL}/artist/${profile.id}/${profile.slug}`;
  const html = await renderArtistShell(shell, profile, pageUrl);
  artistShellCache.set(cacheKey, html, RENDERED_TTL_MS);
  return html;
}

export const artistPageRoutes = new Elysia()
  .get('/artist/:id', handle)
  .get('/artist/:id/:slug', handle);
