-- Migrate all timestamp columns to timestamptz (timestamp with time zone)
-- Workers run UTC in prod, so existing rows are interpreted as UTC during ALTER
-- and their values are preserved. The DO/EXCEPTION wrapper makes this idempotent.

DO $$
BEGIN
  -- user.ban_expires
  BEGIN
    ALTER TABLE "user" ALTER COLUMN "ban_expires" TYPE timestamp with time zone USING "ban_expires" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- user.created_at
  BEGIN
    ALTER TABLE "user" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- user.updated_at
  BEGIN
    ALTER TABLE "user" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- account.access_token_expires_at
  BEGIN
    ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" TYPE timestamp with time zone USING "access_token_expires_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- account.refresh_token_expires_at
  BEGIN
    ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" TYPE timestamp with time zone USING "refresh_token_expires_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- account.created_at
  BEGIN
    ALTER TABLE "account" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- account.updated_at
  BEGIN
    ALTER TABLE "account" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- session.expires_at
  BEGIN
    ALTER TABLE "session" ALTER COLUMN "expires_at" TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- session.created_at
  BEGIN
    ALTER TABLE "session" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- session.updated_at
  BEGIN
    ALTER TABLE "session" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- verification.expires_at
  BEGIN
    ALTER TABLE "verification" ALTER COLUMN "expires_at" TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- verification.created_at
  BEGIN
    ALTER TABLE "verification" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- verification.updated_at
  BEGIN
    ALTER TABLE "verification" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- liked_tracks.created_at
  BEGIN
    ALTER TABLE "liked_tracks" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- user_preferences.updated_at
  BEGIN
    ALTER TABLE "user_preferences" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- push_subscriptions.created_at
  BEGIN
    ALTER TABLE "push_subscriptions" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
