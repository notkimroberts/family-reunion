-- Hand-edited, not as generated. Drizzle emitted a bare
--   ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;
-- which converts existing values using the SESSION TimeZone. These rows were written by now() into a
-- naive column while the database was on UTC, so a session on America/Los_Angeles would have shifted
-- every existing row by its offset, in the wrong direction. AT TIME ZONE 'UTC' states the assumption
-- explicitly and makes the result the same whoever runs the migration.
--
-- Safe to edit rather than stack a correction on top: this file has been applied to no environment,
-- so there is no recorded hash for it to disagree with.
ALTER TABLE "registration_audit"
    ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone
        USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "registration_audit" ALTER COLUMN "created_at" SET DEFAULT now();
