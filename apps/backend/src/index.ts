import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env';
import { pool } from './db';
import { runMigrations } from './db/migrate';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin';
import { securityHeaders, applySecurityHeaders } from './lib/security/securityHeaders';
import { logger } from './lib/logger';
import { trackRoutes } from './routes/track.routes';
import { preferencesRoutes } from './routes/preferences.routes';
import { artistRoutes } from './routes/artist.routes';
import { pushRoutes } from './routes/push.routes';
import { statsRoutes } from './routes/stats.routes';
import { radioRoutes } from './routes/radio.routes';
import { songlinkCache, itunesCache } from './services/songlinkService';
import { lastfmCache } from './services/lastfmService';
import { radioHistoryCache } from './services/radioService';
import { purgeExpiredAuthRows } from './services/pushService';

// Apply pending DB migrations BEFORE serving traffic. The runner tracks
// applied migrations in __app_migrations and is idempotent across restarts.
// Refusing to start with a stale schema is safer than serving 500s.
try {
  await runMigrations(pool);
} catch (err) {
  logger.error('migrations failed, aborting boot', { err: (err as Error).message });
  process.exit(1);
}

// Start TTL cache sweeps (every minute, unref'd so process can exit)
songlinkCache.startSweep();
itunesCache.startSweep();
lastfmCache.startSweep();
radioHistoryCache.startSweep();

// Periodic purge of Better Auth's expired session/verification rows.
// Without this they accumulate indefinitely — Better Auth does not self-clean.
// 6h interval is enough; the table query is O(rows-deleted) via index.
const AUTH_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const purgeTimer = setInterval(() => {
  purgeExpiredAuthRows()
    .then((res) => {
      if (res.sessions > 0 || res.verifications > 0) {
        logger.info('auth purge', res);
      }
    })
    .catch((err: unknown) => {
      logger.error('auth purge failed', { err: (err as Error).message });
    });
}, AUTH_PURGE_INTERVAL_MS);
if (typeof purgeTimer === 'object' && purgeTimer !== null && 'unref' in purgeTimer) {
  (purgeTimer as { unref: () => void }).unref();
}

const app = new Elysia()
  // Per-request start time, available to onAfterHandle via context.
  // `derive` runs after onRequest and before the handler, giving us a
  // closure value per-request without mutating shared state.
  .derive(() => ({ startedAt: performance.now() }))
  .use(securityHeaders)
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(betterAuthPlugin)
  .use(trackRoutes)
  .use(preferencesRoutes)
  .use(artistRoutes)
  .use(pushRoutes)
  .use(statsRoutes)
  .use(radioRoutes)
  .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
  .get('/', () => ({ message: 'AubeSonore API' }))
  .onError(({ error, set, request }) => {
    logger.error('Unhandled error', {
      method: request.method,
      path: new URL(request.url).pathname,
      err: error instanceof Error ? error.message : JSON.stringify(error),
    });
    applySecurityHeaders(set.headers);
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .onAfterHandle(({ request, set, startedAt }) => {
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info('http', {
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status ?? 200,
      durationMs,
    });
  });

const server = app.listen({ port: env.PORT, hostname: '0.0.0.0' });

logger.info('listening', { port: env.PORT, env: env.NODE_ENV });

if (!env.AZURACAST_BASE_URL || !env.AZURACAST_API_KEY) {
  console.warn(
    '/api/radio/history will return 502 until AZURACAST_BASE_URL and AZURACAST_API_KEY are set'
  );
}

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('shutdown received', { signal });

  try {
    await server.stop();
  } catch (err) {
    logger.error('server.stop failed', { err: (err as Error).message });
  }

  songlinkCache.dispose();
  itunesCache.dispose();
  lastfmCache.dispose();
  radioHistoryCache.dispose();

  try {
    await pool.end();
  } catch (err) {
    logger.error('pool.end failed', { err: (err as Error).message });
  }

  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('uncaughtException', (err: Error): void => {
  logger.error('uncaughtException', { err: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason: unknown): void => {
  logger.error('unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
