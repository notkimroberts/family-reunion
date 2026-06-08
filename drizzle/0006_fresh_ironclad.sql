ALTER TABLE "contact_submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "family_member_edits" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pricing_tiers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "storefront_config" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contact_submissions" CASCADE;--> statement-breakpoint
DROP TABLE "family_member_edits" CASCADE;--> statement-breakpoint
DROP TABLE "pricing_tiers" CASCADE;--> statement-breakpoint
DROP TABLE "storefront_config" CASCADE;--> statement-breakpoint
ALTER TABLE "party_members" DROP CONSTRAINT "party_members_pricing_tier_id_pricing_tiers_id_fk";
--> statement-breakpoint
ALTER TABLE "party_members" DROP CONSTRAINT "party_members_registration_id_registrations_id_fk";
--> statement-breakpoint
ALTER TABLE "relationships" DROP CONSTRAINT "relationships_from_member_id_family_members_id_fk";
--> statement-breakpoint
ALTER TABLE "relationships" DROP CONSTRAINT "relationships_to_member_id_family_members_id_fk";
--> statement-breakpoint
ALTER TABLE "photos" ALTER COLUMN "uploaded_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "family_member_id" uuid;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "tier_label" text NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "pricing_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "external_shop_url" text;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "shop_products" jsonb;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN "shop_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_member_id_family_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_member_id_family_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "party_members_registration_id_idx" ON "party_members" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "party_members_family_member_id_idx" ON "party_members" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX "photos_event_id_idx" ON "photos" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "registrations_contact_email_idx" ON "registrations" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "registrations_event_id_idx" ON "registrations" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rel_unique" ON "relationships" USING btree ("from_member_id","to_member_id","type");--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("to_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_event" ON "reunion_events" USING btree ("status") WHERE "reunion_events"."status" = 'open';--> statement-breakpoint
ALTER TABLE "family_members" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN "pricing_tier_id";--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "total_amount_cents";--> statement-breakpoint
ALTER TABLE "relationships" DROP COLUMN "created_by_user_id";--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_stripe_session_id_unique" UNIQUE("stripe_session_id");--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_birth_date_prefix" CHECK (("family_members"."birth_day" IS NULL OR "family_members"."birth_month" IS NOT NULL) AND ("family_members"."birth_month" IS NULL OR "family_members"."birth_year" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_birth_date_prefix" CHECK (("party_members"."birth_day" IS NULL OR "party_members"."birth_month" IS NOT NULL) AND ("party_members"."birth_month" IS NULL OR "party_members"."birth_year" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "rel_no_self" CHECK ("relationships"."from_member_id" <> "relationships"."to_member_id");