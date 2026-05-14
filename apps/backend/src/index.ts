import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env';
import { pool } from './db';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin';
import { securityHeaders } from './lib/security/securityHeaders';
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
  .onRequest(({ request }) => {
    const { method } = request;
    const path = new URL(request.url).pathname;
    console.log(`[${new Date().toISOString()}] ${method} ${path}`);
  })
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
  .onError(({ error, set }) => {
    console.error('[Global Error]', error);
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .onAfterHandle(({ request, set }) => {
    const path = new URL(request.url).pathname;
    console.log(`[${new Date().toISOString()}] ${request.method} ${path} → ${set.status ?? 200}`);
  });

const server = app.listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`\nAubeSonore backend listening on http://localhost:${env.PORT}\n`);

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining...`);

  try {
    await server.stop();
  } catch (err) {
    console.error('[shutdown] server.stop error:', (err as Error).message);
  }

  songlinkCache.dispose();
  itunesCache.dispose();
  lastfmCache.dispose();

  try {
    await pool.end();
  } catch (err) {
    console.error('[shutdown] pool.end error:', (err as Error).message);
  }

  console.log('[shutdown] done');
  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('uncaughtException', (err: Error): void => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: unknown): void => {
  console.error('Unhandled Rejection:', reason);
});
