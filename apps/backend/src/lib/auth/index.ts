import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';

import { env } from '../../config/env';
import { db } from '../../db/index';
import { user, session, verification, account } from '../../db/schema';
import { sendBetterAuthEmail } from './sendBetterAuthEmail';

const isProd = env.IS_PROD;

export const auth = betterAuth({
  url: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/forget-password': { window: 60, max: 3 },
      '/verify-email': { window: 60, max: 10 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    crossSubDomainCookies:
      isProd && env.COOKIE_DOMAIN
        ? { enabled: true, domain: env.COOKIE_DOMAIN }
        : { enabled: false },
    defaultCookieAttributes: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }): Promise<void> => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🔒 Réinitialisez votre mot de passe',
        preheader: 'Réinitialisez votre mot de passe pour continuer à profiter de AubeSonore 🔒',
        buttonLink: url,
        buttonText: 'Réinitialiser mon mot de passe',
        isResetPassword: true,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }): Promise<void> => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🎉 Confirmez votre adresse email',
        preheader: 'Confirmez votre adresse email pour activer votre compte 🎶',
        buttonLink: url,
        buttonText: 'Vérifier mon email',
        isVerificationEmail: true,
      });
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'spotify'],
    },
  },

  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
      ? {
          spotify: {
            clientId: env.SPOTIFY_CLIENT_ID,
            clientSecret: env.SPOTIFY_CLIENT_SECRET,
            scope: ['user-read-email', 'playlist-modify-private', 'playlist-modify-public'],
            callbackUrl: `${env.BACKEND_BASE_URL}/api/auth/spotify/callback`,
          },
        }
      : {}),
  },

  plugins: [admin()],
});
