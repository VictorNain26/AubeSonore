ALTER TABLE "liked_tracks" DROP CONSTRAINT "liked_tracks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "liked_tracks" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "liked_tracks" ADD CONSTRAINT "liked_tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;