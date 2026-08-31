/*
  The three event datetimes become timestamptz.

  USING ... AT TIME ZONE 'UTC' is not decoration. Without it Postgres reads the existing naive digits
  in the SESSION's TimeZone, so the converted instant would depend on whichever container ran the
  migration. The digits in these columns are UTC: every write went through postgres.js, which
  serialises a Date with toISOString(), and the app server on Railway runs in UTC, so that is also how
  they have been read back. Naming UTC here preserves the instants that are actually stored rather
  than the ones a particular session would have guessed.
*/
ALTER TABLE "reunion_events" ALTER COLUMN "start_date" SET DATA TYPE timestamp with time zone USING "start_date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "reunion_events" ALTER COLUMN "end_date" SET DATA TYPE timestamp with time zone USING "end_date" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "reunion_events" ALTER COLUMN "registration_lock_date" SET DATA TYPE timestamp with time zone USING "registration_lock_date" AT TIME ZONE 'UTC';
