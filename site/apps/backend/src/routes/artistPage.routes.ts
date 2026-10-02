import type { SiteLocale } from '@aubesonore/shared-types/client';
import { Elysia } from 'elysia';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { checkRate, getClientIp } from '../lib/rateLimit';
import { getArtistProfile } from '../services/artistProfileService';
import { renderArtistShell } from '../services/templates/artistShell';
import { isValidArtistId } from '../validators/artistValidator';

// Higher than the JSON budget: this is a document route, and a single visit
// pulls one page rather than a burst of API calls.
const PAGE_LIMIT = 60;
const PAGE_WINDOW_MS = 60_000;
const SHELL_TIMEOUT_MS = 3_000;

let shell: { html: string; etag: string | null } | null = null;

/**
 * Revalidated on every request (If-None-Match, a 304 from nginx): a shell kept
 * past a frontend deploy would point at hashed assets that no longer exist.
 */
async function loadShell(): Promise<string | null> {
  try {
    // app.html is the build's empty shell; index.html is the pre-rendered home
    // page, which the client would hydrate as the home page.
    const response = await fetch(`${env.FRONTEND_ORIGIN_INTERNAL}/app.html`, {
      headers: shell?.etag ? { 'if-none-match': shell.etag } : {},
      signal: AbortSignal.timeout(SHELL_TIMEOUT_MS),
    });
    if (response.status === 304 && shell) return shell.html;
    if (!response.ok) {
      logger.warn('artistPage.shell_unavailable', { status: response.status });
      return shell?.html ?? null;
    }
    shell = { html: await response.text(), etag: response.headers.get('etag') };
    return shell.html;
  } catch (err) {
    logger.warn('artistPage.shell_unavailable', { message: (err as Error).message });
    return shell?.html ?? null;
  }
}

/** Test seam: the shell is module state and would leak between tests. */
export function __resetArtistShell(): void {
  shell = null;
}

interface HandlerContext {
  request: Request;
  params: { id: string };
  set: { status?: number | string; headers: Record<string, string | number> };
}

async function handle(
  locale: SiteLocale,
  { request, params, set }: HandlerContext
): Promise<string> {
  const ip = getClientIp(request.headers);
  if (!checkRate('artistPage', ip, PAGE_LIMIT, PAGE_WINDOW_MS)) {
    set.status = 429;
    set.headers['retry-after'] = '60';
    return locale === 'en'
      ? 'Too many requests, retry in 1 minute'
      : 'Trop de requêtes, réessayez dans 1 minute';
  }

  const html = await loadShell();
  if (!html) {
    set.status = 502;
    return locale === 'en' ? 'Site unavailable' : 'Application indisponible';
  }

  set.headers['content-type'] = 'text/html; charset=utf-8';
  // Like every HTML page of the site (nginx.conf): revalidate, or a deploy
  // leaves browsers on a page whose hashed assets are gone.
  set.headers['cache-control'] = 'no-cache';

  // A malformed id (a truncated link) is an unknown artist: no lookup.
  const profile = isValidArtistId(params.id) ? await getArtistProfile(params.id, locale) : null;
  // Unknown artist: a real 404, or crawlers index it as a soft 404. The SPA
  // still boots and renders its own not-found state.
  if (!profile) {
    set.status = 404;
    return html;
  }

  const prefix = locale === 'en' ? '/en' : '';
  const pageUrl = `${env.FRONTEND_BASE_URL}${prefix}/artist/${profile.id}/${profile.slug}`;
  return renderArtistShell(html, profile, pageUrl, locale);
}

const fr = (context: HandlerContext) => handle('fr', context);
const en = (context: HandlerContext) => handle('en', context);

export const artistPageRoutes = new Elysia()
  .get('/artist/:id', fr)
  .get('/artist/:id/:slug', fr)
  .get('/en/artist/:id', en)
  .get('/en/artist/:id/:slug', en);
