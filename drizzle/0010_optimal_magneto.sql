ALTER TABLE "registrations" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "paid_at" timestamp;
-- Both columns are nullable and purely additive, so no backfill and no ordering hazard.
--
-- paid_at is NULL for every registration that was already paid when this ran: before it there was no
-- record of when an online payment landed at all — fulfillCheckout wrote no audit row, and updatedAt is
-- bumped by any later edit, so it is not a payment date. The admin list shows the date when it has one
-- and says nothing when it does not, rather than printing a wrong one.
--
-- stripe_payment_intent_id duplicates a column party_members already has, on purpose: that one is
-- per-member and unreliable (null for a cheque payer and for an abandoned checkout), and this is the id
-- the admin list deep-links to the Stripe dashboard with.
