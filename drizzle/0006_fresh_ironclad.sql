-- Add new columns nullable; backfill from pricing_tiers BEFORE dropping it, then SET NOT NULL.
ALTER TABLE "party_members" ADD COLUMN IF NOT EXISTS "family_member_id" uuid;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN IF NOT EXISTS "tier_label" text;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN IF NOT EXISTS "price_cents" integer;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN IF NOT EXISTS "pricing_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN IF NOT EXISTS "external_shop_url" text;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN IF NOT EXISTS "shop_products" jsonb;--> statement-breakpoint
ALTER TABLE "reunion_events" ADD COLUMN IF NOT EXISTS "shop_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Migrate pricing_tiers TABLE rows into reunion_events.pricing_tiers JSONB column.
UPDATE "reunion_events" e
SET "pricing_tiers" = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
        'id', pt.id::text,
        'label', pt.label,
        'minAge', pt.min_age,
        'maxAge', pt.max_age,
        'priceCents', pt.price_cents
    ))
    FROM "pricing_tiers" pt WHERE pt.event_id = e.id
), '[]'::jsonb) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers');--> statement-breakpoint
-- Backfill party_members.tier_label and price_cents from the soon-to-be-dropped pricing_tiers.
UPDATE "party_members" pm
SET "tier_label" = pt.label, "price_cents" = pt.price_cents
FROM "pricing_tiers" pt
WHERE pm."pricing_tier_id" = pt.id AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers');--> statement-breakpoint
UPDATE "party_members" SET "tier_label" = 'unknown' WHERE "tier_label" IS NULL;--> statement-breakpoint
UPDATE "party_members" SET "price_cents" = 0 WHERE "price_cents" IS NULL;--> statement-breakpoint
ALTER TABLE "party_members" ALTER COLUMN "tier_label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" ALTER COLUMN "price_cents" SET NOT NULL;--> statement-breakpoint
-- Pre-clean rows so the new CHECK constraints are satisfiable.
UPDATE "family_members" SET "birth_day" = NULL WHERE "birth_day" IS NOT NULL AND "birth_month" IS NULL;--> statement-breakpoint
UPDATE "family_members" SET "birth_month" = NULL, "birth_day" = NULL WHERE "birth_month" IS NOT NULL AND "birth_year" IS NULL;--> statement-breakpoint
UPDATE "party_members" SET "birth_day" = NULL WHERE "birth_day" IS NOT NULL AND "birth_month" IS NULL;--> statement-breakpoint
UPDATE "party_members" SET "birth_month" = NULL, "birth_day" = NULL WHERE "birth_month" IS NOT NULL AND "birth_year" IS NULL;--> statement-breakpoint
DELETE FROM "relationships" WHERE "from_member_id" = "to_member_id";--> statement-breakpoint
-- Close all but the most-recent open event so the partial unique index is satisfiable.
UPDATE "reunion_events" SET "status" = 'closed' WHERE "id" IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
        FROM "reunion_events" WHERE "status" = 'open'
    ) ranked WHERE rn > 1
);--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "party_members" DROP CONSTRAINT "party_members_pricing_tier_id_pricing_tiers_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $;
--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "party_members" DROP CONSTRAINT "party_members_registration_id_registrations_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $;
--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "relationships" DROP CONSTRAINT "relationships_from_member_id_family_members_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $;
--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "relationships" DROP CONSTRAINT "relationships_to_member_id_family_members_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $;
--> statement-breakpoint
ALTER TABLE "photos" ALTER COLUMN "uploaded_by_user_id" DROP NOT NULL;--> statement-breakpoint
DROP TABLE IF EXISTS "contact_submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "family_member_edits" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "pricing_tiers" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "storefront_config" CASCADE;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "party_members" ADD CONSTRAINT "party_members_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "party_members" ADD CONSTRAINT "party_members_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_member_id_family_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_member_id_family_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_members_registration_id_idx" ON "party_members" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "party_members_family_member_id_idx" ON "party_members" USING btree ("family_member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_event_id_idx" ON "photos" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registrations_contact_email_idx" ON "registrations" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registrations_event_id_idx" ON "registrations" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rel_unique" ON "relationships" USING btree ("from_member_id","to_member_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_to_idx" ON "relationships" USING btree ("to_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_open_event" ON "reunion_events" USING btree ("status") WHERE "reunion_events"."status" = 'open';--> statement-breakpoint
ALTER TABLE "family_members" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN IF EXISTS "pricing_tier_id";--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN IF EXISTS "total_amount_cents";--> statement-breakpoint
ALTER TABLE "relationships" DROP COLUMN IF EXISTS "created_by_user_id";--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_stripe_session_id_unique" UNIQUE("stripe_session_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "family_members" ADD CONSTRAINT "family_members_birth_date_prefix" CHECK (("family_members"."birth_day" IS NULL OR "family_members"."birth_month" IS NOT NULL) AND ("family_members"."birth_month" IS NULL OR "family_members"."birth_year" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "party_members" ADD CONSTRAINT "party_members_birth_date_prefix" CHECK (("party_members"."birth_day" IS NULL OR "party_members"."birth_month" IS NOT NULL) AND ("party_members"."birth_month" IS NULL OR "party_members"."birth_year" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "relationships" ADD CONSTRAINT "rel_no_self" CHECK ("relationships"."from_member_id" <> "relationships"."to_member_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

