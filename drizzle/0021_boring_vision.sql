CREATE TYPE "public"."photo_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"status" "photo_status" DEFAULT 'pending' NOT NULL,
	"display_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"caption" text,
	"contributor_name" text,
	"source_key" text,
	"taken_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_reunion_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reunion_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photos_event_id_idx" ON "photos" USING btree ("event_id");