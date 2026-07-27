-- Artist discovery page: canonical artist identity + what the antenna played.
-- All idempotent (IF NOT EXISTS) so the runner can re-apply safely.

-- Canonical identity, resolved once from the messy AzuraCast artist string.
-- Nullable deezer_id/mbid stay unique: Postgres allows repeated NULLs in a
-- unique index, so unresolved rows do not collide with each other.
CREATE TABLE IF NOT EXISTS artist (
  id text PRIMARY KEY NOT NULL,
  normalized_name text NOT NULL,
  display_name text NOT NULL,
  slug text NOT NULL,
  deezer_id text,
  mbid text,
  first_seen_at timestamp with time zone DEFAULT now() NOT NULL
);

-- The resolution hot path is a single lookup on normalized_name.
CREATE UNIQUE INDEX IF NOT EXISTS artist_normalized_name_unique
  ON artist (normalized_name);
CREATE UNIQUE INDEX IF NOT EXISTS artist_deezer_id_unique
  ON artist (deezer_id);
CREATE UNIQUE INDEX IF NOT EXISTS artist_mbid_unique
  ON artist (mbid);

-- The artist page's guaranteed floor: no external source can tell us what
-- this radio played, so we record it ourselves.
CREATE TABLE IF NOT EXISTS radio_play (
  id text PRIMARY KEY NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  artist_normalized text NOT NULL,
  played_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Backs WHERE artist_normalized = $1 ORDER BY played_at DESC LIMIT N.
CREATE INDEX IF NOT EXISTS radio_play_artist_played_at_idx
  ON radio_play (artist_normalized, played_at DESC);
