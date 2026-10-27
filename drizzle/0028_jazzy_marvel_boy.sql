CREATE TABLE "stripe_fees" (
	"payment_intent_id" text PRIMARY KEY NOT NULL,
	"fee_cents" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
