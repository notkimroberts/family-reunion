ALTER TABLE "party_members" ADD COLUMN "shirt_size" text;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "shirts_enabled" boolean DEFAULT false NOT NULL;