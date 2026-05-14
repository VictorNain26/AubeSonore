import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env';
import { pool } from './db';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin';
import { securityHeaders } from './lib/security/securityHeaders';
import { logger } from './lib/logger';
import { trackRoutes } from './routes/track.routes';
import { preferencesRoutes } from './routes/preferences.routes';
import { artistRoutes } from './routes/artist.routes';
import { pushRoutes } from './routes/push.routes';
import { songlinkCache, itunesCache } from './services/songlinkService';
import { lastfmCache } from './services/lastfmService';

// Start TTL cache sweeps (every minute, unref'd so process can exit)
songlinkCache.startSweep();
itunesCache.startSweep();
lastfmCache.startSweep();

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
  .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
  .get('/', () => ({ message: 'AubeSonore API' }))
  .onError(({ error, set, request }) => {
    logger.error('Unhandled error', {
      method: request.method,
      path: new URL(request.url).pathname,
      err: error instanceof Error ? error.message : JSON.stringify(error),
    });
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
