-- Idempotent re-applicable variant. Drizzle did not transactionally roll back the
-- previous failed apply, so on retry every statement must tolerate "already done."
ALTER TABLE IF EXISTS "user_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "user_profiles" CASCADE;--> statement-breakpoint
UPDATE "registrations" SET "contact_name" = '' WHERE "contact_name" IS NULL;--> statement-breakpoint
UPDATE "registrations" SET "contact_email" = '' WHERE "contact_email" IS NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_email" SET NOT NULL;--> statement-breakpoint
-- Add management_token nullable, backfill, then SET NOT NULL. Existing registrants
-- recover a usable manage URL via /register/recover (which rotates the token and emails it).
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "management_token" text;--> statement-breakpoint
UPDATE "registrations" SET "management_token" = encode(gen_random_bytes(32), 'hex') WHERE "management_token" IS NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "management_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "registrations" ADD CONSTRAINT "registrations_management_token_unique" UNIQUE("management_token");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
