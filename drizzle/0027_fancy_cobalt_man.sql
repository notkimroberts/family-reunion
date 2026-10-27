ALTER TABLE "party_members" ADD COLUMN "card_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill the fee inside every price a card paid for: the rows the display treated as grossed up
-- (a payment intent on the member). The tier price is floor(gross * 0.971) - 30, the exact inverse of
-- grossUpForStripe for every net it produces — checked against the JS for all nets up to $5,000.
UPDATE "party_members"
SET "card_fee_cents" = "price_cents" - (("price_cents" * 971) / 1000 - 30)
WHERE "stripe_payment_intent_id" IS NOT NULL AND "price_cents" > 0;--> statement-breakpoint
-- payment_due now means "owed now": it is cleared whenever a booking leaves 'paid'. Clear any flag
-- left on a booking that already has, so no row starts outside that rule.
UPDATE "party_members"
SET "payment_due" = false
FROM "registrations"
WHERE "party_members"."registration_id" = "registrations"."id"
  AND "party_members"."payment_due"
  AND "registrations"."status" <> 'paid';
