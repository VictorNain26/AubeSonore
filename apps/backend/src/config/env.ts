interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  FRONTEND_BASE_URL: string;
  BACKEND_BASE_URL: string;
  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;
  ALLOWED_ORIGINS: string[];
  COOKIE_DOMAIN: string | undefined;
  LASTFM_API_KEY: string | undefined;
  VAPID_PUBLIC_KEY: string | undefined;
  VAPID_PRIVATE_KEY: string | undefined;
  SMTP_HOST: string | undefined;
  SMTP_PORT: number;
  SMTP_USER: string | undefined;
  SMTP_PASSWORD: string | undefined;
  SMTP_FROM: string;
}

export const env: EnvConfig = {
  PORT: Bun.env.PORT ? parseInt(Bun.env.PORT, 10) : 3000,
  DATABASE_URL: Bun.env.DATABASE_URL as string,
  BETTER_AUTH_SECRET: Bun.env.BETTER_AUTH_SECRET as string,
  BETTER_AUTH_URL: Bun.env.BETTER_AUTH_URL as string,
  FRONTEND_BASE_URL: Bun.env.FRONTEND_BASE_URL ?? 'http://localhost:8080',
  BACKEND_BASE_URL: Bun.env.BACKEND_BASE_URL ?? 'http://localhost:3000',
  GOOGLE_CLIENT_ID: Bun.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: Bun.env.GOOGLE_CLIENT_SECRET,
  ALLOWED_ORIGINS: Bun.env.ALLOWED_ORIGINS
    ? Bun.env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim())
    : ['http://localhost:8080'],
  COOKIE_DOMAIN: Bun.env.COOKIE_DOMAIN,
  LASTFM_API_KEY: Bun.env.LASTFM_API_KEY,
  VAPID_PUBLIC_KEY: Bun.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: Bun.env.VAPID_PRIVATE_KEY,
  SMTP_HOST: Bun.env.SMTP_HOST,
  SMTP_PORT: Bun.env.SMTP_PORT ? parseInt(Bun.env.SMTP_PORT, 10) : 587,
  SMTP_USER: Bun.env.SMTP_USER,
  SMTP_PASSWORD: Bun.env.SMTP_PASSWORD,
  SMTP_FROM: Bun.env.SMTP_FROM ?? 'AubeSonore <noreply@aubesonore.fr>',
};

if (!env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL manquant');
}
if (!env.BETTER_AUTH_SECRET) {
  throw new Error('❌ BETTER_AUTH_SECRET manquant');
}
if (!env.BETTER_AUTH_URL) {
  throw new Error('❌ BETTER_AUTH_URL manquant (exemple: http://localhost:3000)');
}
