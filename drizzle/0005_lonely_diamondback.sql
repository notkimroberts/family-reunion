ALTER TABLE "user_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_profiles" CASCADE;--> statement-breakpoint
-- Backfill any NULL contact fields before tightening constraints.
UPDATE "registrations" SET "contact_name" = '' WHERE "contact_name" IS NULL;--> statement-breakpoint
UPDATE "registrations" SET "contact_email" = '' WHERE "contact_email" IS NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_email" SET NOT NULL;--> statement-breakpoint
-- Add management_token nullable, backfill existing rows with a random hex string the
-- DB treats as the hash, then SET NOT NULL. Existing registrations won't have a usable
-- manage URL until the contact recovers via /register/recover, which rotates the token
-- and emails a fresh link.
ALTER TABLE "registrations" ADD COLUMN "management_token" text;--> statement-breakpoint
UPDATE "registrations" SET "management_token" = encode(gen_random_bytes(32), 'hex') WHERE "management_token" IS NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "management_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_management_token_unique" UNIQUE("management_token");
