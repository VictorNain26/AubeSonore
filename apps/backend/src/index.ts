import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin';
import { trackRoutes } from './routes/track.routes';
import { preferencesRoutes } from './routes/preferences.routes';

const app = new Elysia();

// ✅ Log propre des requêtes
app.onRequest(({ request }): void => {
  const { method, url, headers } = request;
  const origin = headers.get('origin');
  const isPreflight = method === 'OPTIONS';
  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} – Origin: ${origin}`,
  );
});

// ✅ CORS
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ✅ Auth BetterAuth
app.use(betterAuthPlugin);

// ✅ Routes
app.use(trackRoutes);
app.use(preferencesRoutes);

// ✅ Healthcheck
app.get('/health', (): { status: string; uptime: number } => ({
  status: 'ok',
  uptime: process.uptime(),
}));

// ✅ Accueil
app.get('/', (): { message: string } => ({
  message: "Bienvenue sur l'API AubeSonore 🎶",
}));

// ❌ Gestion des erreurs
app.onError(({ error }): { status: number; error: string } => {
  console.error('[Global Error]', error);
  return {
    status: 500,
    error: 'Erreur interne du serveur',
  };
});

// ✅ Log sortie
app.onAfterHandle(({ request }): void => {
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → 200`,
  );
});

// ✅ Lancement du serveur
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log('\n✅ OurMusic Backend est lancé et accessible :');
console.log(`➡️ URL : http://localhost:${env.PORT}\n`);

// 🔥 Gestion erreurs fatales
process.on('uncaughtException', (err: Error): void => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: unknown): void => {
  console.error('❌ Unhandled Rejection:', reason);
});
