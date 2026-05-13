import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin';
import { securityHeaders } from './lib/security/securityHeaders';
import { trackRoutes } from './routes/track.routes';
import { preferencesRoutes } from './routes/preferences.routes';
import { artistRoutes } from './routes/artist.routes';
import { pushRoutes } from './routes/push.routes';

const app = new Elysia();

app.onRequest(({ request }): void => {
  const { method } = request;
  const path = new URL(request.url).pathname;
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);
});

app.use(securityHeaders);

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(betterAuthPlugin);

app.use(trackRoutes);
app.use(preferencesRoutes);
app.use(artistRoutes);
app.use(pushRoutes);

app.get('/health', (): { status: string; uptime: number } => ({
  status: 'ok',
  uptime: process.uptime(),
}));

app.get('/', (): { message: string } => ({
  message: 'AubeSonore API',
}));

app.onError(({ error, set }): { error: string } => {
  console.error('[Global Error]', error);
  set.status = 500;
  return { error: 'Internal server error' };
});

app.onAfterHandle(({ request, set }): void => {
  const path = new URL(request.url).pathname;
  console.log(`[${new Date().toISOString()}] ${request.method} ${path} → ${set.status ?? 200}`);
});

app.listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`\nAubeSonore backend listening on http://localhost:${env.PORT}\n`);

process.on('uncaughtException', (err: Error): void => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: unknown): void => {
  console.error('Unhandled Rejection:', reason);
});
