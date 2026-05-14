import {
  pgTable,
  text,
  timestamp,
  unique,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
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

export type PreferredPlatform =
  | 'spotify'
  | 'appleMusic'
  | 'deezer'
  | 'youtubeMusic'
  | 'tidal'
  | 'amazonMusic'
  | 'soundcloud'
  | 'youtube';

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
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
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
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    providerAccountUnique: unique().on(table.providerId, table.accountId),
    accountUserIdIdx: index('account_user_id_idx').on(table.userId),
  })
);

// ─────────────────────────────────────────────
// SESSION TABLE
// ─────────────────────────────────────────────
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    sessionUserIdIdx: index('session_user_id_idx').on(table.userId),
    sessionExpiresAtIdx: index('session_expires_at_idx').on(table.expiresAt),
  })
);

// ─────────────────────────────────────────────
// VERIFICATION TABLE
// ─────────────────────────────────────────────
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    verificationIdentifierIdx: index('verification_identifier_idx').on(table.identifier),
    verificationExpiresIdx: index('verification_expires_at_idx').on(table.expiresAt),
  })
);

// ─────────────────────────────────────────────
// LIKED_TRACKS TABLE (custom pour AubeSonore)
// ─────────────────────────────────────────────
export const likedTracks = pgTable(
  'liked_tracks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    album: text('album'),

    artworkUrl: text('artwork_url'),

    youtubeUrl: text('youtube_url').notNull(),
    isrc: text('isrc'),

    songlinkUrl: text('songlink_url'),
    platformLinks: jsonb('platform_links').$type<PlatformLinks>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    likedTracksUserIdIdx: index('liked_tracks_user_id_idx').on(table.userId),
    // Unique to eliminate the select+insert race on concurrent likes.
    // Doubles as the lookup index for "is this track liked?" queries.
    likedTracksUserTitleArtistUnique: uniqueIndex('liked_tracks_user_title_artist_unique').on(
      table.userId,
      table.title,
      table.artist
    ),
    // Backs the `getLikedTracks` listing (WHERE user_id ORDER BY created_at DESC).
    // Without this, Postgres does an Index Scan on user_id then an in-memory Sort.
    likedTracksUserCreatedAtIdx: index('liked_tracks_user_created_at_idx').on(
      table.userId,
      table.createdAt
    ),
  })
);

// ─────────────────────────────────────────────
// USER_PREFERENCES TABLE
// ─────────────────────────────────────────────
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferredPlatform: text('preferred_platform')
    .$type<PreferredPlatform>()
    .notNull()
    .default('spotify'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PUSH_SUBSCRIPTIONS TABLE
// ─────────────────────────────────────────────
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pushSubsUserIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
    pushSubsEndpointUnique: unique('push_subscriptions_endpoint_unique').on(table.endpoint),
  })
);

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

export type PushSubscription = InferSelectModel<typeof pushSubscriptions>;
export type NewPushSubscription = InferInsertModel<typeof pushSubscriptions>;
