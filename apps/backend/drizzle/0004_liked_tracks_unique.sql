-- Dedupe + add unique index on (user_id, title, artist) for liked_tracks.
-- This replaces the previous non-unique composite index and closes the
-- select+insert race in trackService.likeTrack.
--
-- Step 1 keeps the OLDEST duplicate (lowest id by lexicographic order — UUIDs
-- so effectively random, which is fine: we only need to keep one).

DELETE FROM liked_tracks a
USING liked_tracks b
WHERE
  a.user_id = b.user_id
  AND a.title = b.title
  AND a.artist = b.artist
  AND a.id > b.id;

DROP INDEX IF EXISTS liked_tracks_user_title_artist_idx;

CREATE UNIQUE INDEX IF NOT EXISTS liked_tracks_user_title_artist_unique
  ON liked_tracks (user_id, title, artist);
