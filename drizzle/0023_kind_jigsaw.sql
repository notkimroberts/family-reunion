ALTER TABLE "reunion_events" ADD COLUMN "registration_opens_at" timestamp with time zone;--> statement-breakpoint
-- The 2027 reunion's registration opens on Saturday 2026-10-31 at 9:00 AM Pacific. October 31 is still
-- daylight time (it ends 2026-11-01), so -07. Set here so the deploy that adds the column also closes
-- the form until then, without a separate step in the settings page. Only the open event: a past
-- year's opening date means nothing. On an empty database this updates nothing.
UPDATE "reunion_events" SET "registration_opens_at" = '2026-10-31 09:00:00-07' WHERE "status" = 'open';
