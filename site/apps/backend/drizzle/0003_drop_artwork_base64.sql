-- Drop the legacy artwork_base64 column from liked_tracks.
-- Apply with: psql $DATABASE_URL -f apps/backend/drizzle/0003_drop_artwork_base64.sql
-- Or rely on `bun db:push` to drop it via schema sync.

ALTER TABLE "liked_tracks" DROP COLUMN IF EXISTS "artwork_base64";
