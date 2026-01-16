import { pgTable, text, timestamp, unique, boolean, jsonb } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type PlatformLinks = {
  spotify?: string;
  appleMusic?: string;
  deezer?: string;
  youtubeMusic?: string;
  tidal?: string;
  amazonMusic?: string;
  soundcloud?: string;
};

export type PreferredPlatform = 'spotify' | 'appleMusic' | 'deezer' | 'youtubeMusic' | 'tidal' | 'amazonMusic' | 'soundcloud' | 'youtube';

// ─────────────────────────────────────────────
// USER TABLE
// ─────────────────────────────────────────────
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// ─────────────────────────────────────────────
// ACCOUNT TABLE
// ─────────────────────────────────────────────
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),

    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  table => ({
    providerAccountUnique: unique().on(table.providerId, table.accountId),
  }),
);

// ─────────────────────────────────────────────
// SESSION TABLE
// ─────────────────────────────────────────────
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// ─────────────────────────────────────────────
// VERIFICATION TABLE
// ─────────────────────────────────────────────
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ─────────────────────────────────────────────
// LIKED_TRACKS TABLE (custom pour OurMusic)
// ─────────────────────────────────────────────
export const likedTracks = pgTable('liked_tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),

  // Artwork - URL originale + backup base64
  artworkUrl: text('artwork_url'), // URL externe (AzuraCast, etc.)
  artworkBase64: text('artwork_base64'), // Backup en base64 pour persistence

  // Identifiants pour recherche multi-plateformes
  youtubeUrl: text('youtube_url').notNull(),
  isrc: text('isrc'), // International Standard Recording Code

  // Liens vers les plateformes de streaming
  songlinkUrl: text('songlink_url'), // Lien Odesli/Songlink universel
  platformLinks: jsonb('platform_links').$type<PlatformLinks>(), // Liens directs par plateforme

  // Métadonnées
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // userId en text, cohérent avec user.id
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// ─────────────────────────────────────────────
// USER_PREFERENCES TABLE
// ─────────────────────────────────────────────
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferredPlatform: text('preferred_platform').$type<PreferredPlatform>().notNull().default('spotify'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// TYPES INFÉRÉS
// ─────────────────────────────────────────────

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

export type LikedTrack = InferSelectModel<typeof likedTracks>;
export type NewLikedTrack = InferInsertModel<typeof likedTracks>;

export type UserPreferences = InferSelectModel<typeof userPreferences>;
export type NewUserPreferences = InferInsertModel<typeof userPreferences>;
