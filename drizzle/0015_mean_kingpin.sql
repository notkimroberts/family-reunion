-- Adds registrations.stripe_fee_cents; drops tiers.shirt_size_category and its enum.
--
-- Correct as drizzle-kit generated it, unlike 0011: the column is dropped BEFORE the type it uses,
-- which is the one ordering that matters here — Postgres refuses to drop a type a column still
-- references. IF EXISTS added only so the file is safe to re-run.
--
-- stripe_fee_cents is nullable and ACCUMULATES across every charge on a registration: the initial
-- checkout is one PaymentIntent and each add_member is another, so a value assigned once would
-- silently discard the rest. NULL means "not known" — every row predating this column, and any charge
-- whose balance transaction could not be read — and the admin panel falls back to estimating
-- 2.9% + 30¢ for those, saying so on screen. No backfill: production has taken no real payment, so
-- every future charge records its own fee and there is nothing historical to reconstruct.
--
-- shirt_size_category was write-only. Set by the tier form, returned by resolveTierPricing to four call
-- sites, and read by none of them: every shirt list renders the same SHIRT_SIZES regardless. The tier
-- LABEL already distinguishes an adult place from a child one, and the admin order sheet groups shirt
-- counts by that label. Dropping it loses a flag that changed nothing on screen.

ALTER TABLE "registrations" ADD COLUMN "stripe_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "tiers" DROP COLUMN IF EXISTS "shirt_size_category";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."shirt_size_category";
