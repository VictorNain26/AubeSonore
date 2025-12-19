ALTER TABLE "account" DROP CONSTRAINT "provider_account_unique";--> statement-breakpoint
ALTER TABLE "liked_tracks" DROP CONSTRAINT "unique_user_track";--> statement-breakpoint
ALTER TABLE "verification" DROP CONSTRAINT "verification_token_unique";--> statement-breakpoint
DROP INDEX "session_user_id_idx";--> statement-breakpoint
DROP INDEX "verification_expires_idx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "liked_tracks" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "liked_tracks" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "provider_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "id_token" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "access_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "created_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "created_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "identifier" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "value" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "created_at" timestamp;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "provider_account_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");