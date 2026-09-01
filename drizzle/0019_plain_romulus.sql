ALTER TABLE "party_members" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "checked_in_by" text;