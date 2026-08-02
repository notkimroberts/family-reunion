CREATE TYPE "public"."event_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending', 'paid', 'refunded', 'waived');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'great_grandparent', 'great_grandchild', 'great_great_grandparent', 'great_great_grandchild', 'great_great_great_grandparent', 'great_great_great_grandchild', 'great_great_great_great_grandparent', 'great_great_great_great_grandchild', 'great_great_great_great_great_grandparent', 'great_great_great_great_great_grandchild', 'aunt_uncle', 'niece_nephew', 'cousin', 'half_sibling', 'step_parent', 'step_child', 'step_sibling', 'in_law', 'great_aunt_uncle', 'great_niece_nephew', 'second_cousin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"birth_year" integer,
	"birth_month" integer,
	"birth_day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_birth_date_prefix" CHECK (("family_members"."birth_day" IS NULL OR "family_members"."birth_month" IS NOT NULL) AND ("family_members"."birth_month" IS NULL OR "family_members"."birth_year" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "party_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"family_member_id" uuid,
	"name" text NOT NULL,
	"birth_year" integer,
	"birth_month" integer,
	"birth_day" integer,
	"shirt_size" text,
	"tier_label" text NOT NULL,
	"price_cents" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "party_members_birth_date_prefix" CHECK (("party_members"."birth_day" IS NULL OR "party_members"."birth_month" IS NOT NULL) AND ("party_members"."birth_month" IS NULL OR "party_members"."birth_year" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"uploaded_by_user_id" text,
	"r2_key" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"management_token" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"event_id" uuid NOT NULL,
	"stripe_session_id" text,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_management_token_unique" UNIQUE("management_token"),
	CONSTRAINT "registrations_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_member_id" uuid NOT NULL,
	"to_member_id" uuid NOT NULL,
	"type" "relationship_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rel_no_self" CHECK ("relationships"."from_member_id" <> "relationships"."to_member_id")
);
--> statement-breakpoint
CREATE TABLE "reunion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"venue" jsonb,
	"menu" jsonb,
	"drinks" jsonb,
	"recommended_sites" jsonb,
	"recommended_activities" jsonb,
	"schedule" jsonb,
	"shirts_enabled" boolean DEFAULT false NOT NULL,
	"adult_price_cents" integer NOT NULL,
	"child_price_cents" integer NOT NULL,
	"external_shop_url" text,
	"shop_products" jsonb,
	"shop_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_reunion_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reunion_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_reunion_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reunion_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_member_id_family_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_member_id_family_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "party_members_registration_id_idx" ON "party_members" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "party_members_family_member_id_idx" ON "party_members" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "photos_event_id_idx" ON "photos" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "registrations_contact_email_idx" ON "registrations" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "registrations_event_id_idx" ON "registrations" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rel_unique" ON "relationships" USING btree ("from_member_id","to_member_id","type");--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("to_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_event" ON "reunion_events" USING btree ("status") WHERE "reunion_events"."status" = 'open';