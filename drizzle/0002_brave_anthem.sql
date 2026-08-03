CREATE TYPE "public"."shirt_size_category" AS ENUM('adult', 'child');--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"price_cents" integer NOT NULL,
	"shirt_size_category" "shirt_size_category" DEFAULT 'adult' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "address_zip" text;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "vegetarian_meal" boolean;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "attended_reunion_2025" boolean;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "registration_lock_date" timestamp;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_event_id_reunion_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reunion_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tiers_event_id_idx" ON "tiers" USING btree ("event_id");--> statement-breakpoint
INSERT INTO "tiers" ("event_id", "label", "price_cents", "shirt_size_category") SELECT "id", 'Adult', "adult_price_cents", 'adult' FROM "reunion_events";--> statement-breakpoint
INSERT INTO "tiers" ("event_id", "label", "price_cents", "shirt_size_category") SELECT "id", 'Child', "child_price_cents", 'child' FROM "reunion_events";