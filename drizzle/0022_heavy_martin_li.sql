-- better-auth >= 1.7 requires account.issuer. Added nullable, backfilled, then constrained: the
-- generated `ADD COLUMN ... NOT NULL` aborts on any database that already holds an account row.
--
-- Existing rows are all providerId 'credential' — this app enables email+password only, and magic
-- link was removed — so `local:<providerId>` (better-auth's createLocalAccountIssuer) is correct for
-- every one. An OAuth account would need `local:oauth:<providerId>` instead; there are none.
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:' || "provider_id" WHERE "issuer" IS NULL;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
