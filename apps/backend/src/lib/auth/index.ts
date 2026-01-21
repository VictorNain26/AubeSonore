// src/lib/auth/index.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';

import { env } from '../../config/env';
import { db } from '../../db/index';
import { user, session, verification, account } from '../../db/schema';
import { sendBetterAuthEmail } from './sendBetterAuthEmail';

const isProd: boolean = process.env.NODE_ENV === 'production' || process.env.ENV === 'production';

export const auth = betterAuth({
  url: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  cookies: {
    secure: isProd,
  },

  advanced: {
    useSecureCookies: isProd,
    crossSubDomainCookies:
      isProd && env.COOKIE_DOMAIN
        ? {
            enabled: true,
            domain: env.COOKIE_DOMAIN,
          }
        : { enabled: false },
    defaultCookieAttributes: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
    },
  },

  cors: {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
  },

  plugins: [admin()],

  // Auth par email / mot de passe
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,

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
        preheader: 'Réinitialisez votre mot de passe pour continuer à profiter de OurMusic 🔒',
        buttonLink: url,
        buttonText: 'Réinitialiser mon mot de passe',
        isResetPassword: true,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: false,
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

    // onVerified: async (ctx: { redirect: (url: string) => any }): Promise<any> => {
    //   return ctx.redirect(`${env.FRONTEND_BASE_URL}?email_verified=success`);
    // },
  },

  // 🔗 Authentification Spotify native
  /* Account Linking */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'spotify'],
    },
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    },
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
      scope: ['user-read-email', 'playlist-modify-private', 'playlist-modify-public'],
      callbackUrl: `${env.BACKEND_BASE_URL}/api/auth/spotify/callback`,
    },
  },

  // Logs utiles
  onSignUp(ctx: { user: { email: string } }): void {
    console.log(`🆕 Nouvel utilisateur inscrit : ${ctx.user.email}`);
  },
  onLogin(ctx: { user: { email: string } }): void {
    console.log(`✅ Connexion réussie : ${ctx.user.email}`);
  },
  onLogout(ctx: { user: { email: string } }): void {
    console.log(`👋 Déconnexion : ${ctx.user.email}`);
  },
});
