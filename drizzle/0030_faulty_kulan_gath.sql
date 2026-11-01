CREATE TYPE "public"."announcement_audience" AS ENUM('confirmed', 'everyone_active');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience" "announcement_audience" NOT NULL,
	"recipients" jsonb NOT NULL,
	"sent_by_user_id" text,
	"sent_by_name" text,
	"status" "announcement_status" DEFAULT 'sending' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_event_id_reunion_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reunion_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_event_id_idx" ON "announcements" USING btree ("event_id");