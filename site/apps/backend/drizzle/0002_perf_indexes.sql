-- Performance indexes (manual migration)
-- These are NOT auto-generated because schema.ts has diverged from the last drizzle snapshot.
-- Apply with: psql $DATABASE_URL -f apps/backend/drizzle/0002_perf_indexes.sql
-- Or rely on `bun db:push` which will sync schema.ts to the DB.
--
-- Rationale: migration 0001_lethal_liz_osborn.sql dropped session_user_id_idx and
-- verification_expires_idx without recreating them. liked_tracks/account/push_subscriptions
-- never had user_id indexes. At any non-trivial volume, every authenticated request did
-- a seq scan on these tables.

CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "session_expires_at_idx" ON "session" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
CREATE INDEX IF NOT EXISTS "verification_expires_at_idx" ON "verification" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "liked_tracks_user_id_idx" ON "liked_tracks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "liked_tracks_user_title_artist_idx" ON "liked_tracks" USING btree ("user_id", "title", "artist");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");

-- push_subscriptions.endpoint should be unique; if duplicates exist they will block this.
-- Run `SELECT endpoint, count(*) FROM push_subscriptions GROUP BY endpoint HAVING count(*) > 1;`
-- first if you suspect collisions.
ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE ("endpoint");
