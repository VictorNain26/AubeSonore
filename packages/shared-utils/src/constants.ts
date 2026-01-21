/**
 * Spotify genres for scraping
 */
export const SPOTIFY_GENRES = [
  'indie+rock',
  'pop',
  'electronica',
  'electronic',
  'hip+hop',
  'rock',
  'classical',
  'awesome',
] as const;

/**
 * Excluded tags for track filtering
 */
export const EXCLUDED_TAGS = [
  'trance',
  'metal',
  'dubstep',
  'acid',
  'screamo',
  'easy+listening',
  'heavy+metal',
  'industrial+metal',
  'emo',
  'black+metal',
  'death+metal',
  'hardcore',
  'reggae',
  'trash+metal',
] as const;

/**
 * User roles
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
