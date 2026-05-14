-- Performance indexes — May 2026 audit follow-up.
-- All idempotent (IF NOT EXISTS) so the runner can re-apply safely.

-- Backs WHERE user_id = $1 ORDER BY created_at DESC LIMIT N in
-- trackService.getLikedTracks. Eliminates the in-memory sort for power users.
CREATE INDEX IF NOT EXISTS liked_tracks_user_created_at_idx
  ON liked_tracks (user_id, created_at DESC);
