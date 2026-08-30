-- Part two of two: drop the six columns 0013 copied into reunion_events.metadata.
--
-- Correct as drizzle-kit generated it — six independent drops with no ordering hazard. IF EXISTS
-- added only so the file is safe to re-run.
--
-- THIS DESTROYS DATA, and only 0013 stands between the old content and losing it. If 0013 did not
-- run, or its UPDATE was edited, stop here. To check before deploying:
--   SELECT year, metadata FROM reunion_events ORDER BY year;

ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "venue";--> statement-breakpoint
ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "menu";--> statement-breakpoint
ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "drinks";--> statement-breakpoint
ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "recommended_sites";--> statement-breakpoint
ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "recommended_activities";--> statement-breakpoint
ALTER TABLE "reunion_events" DROP COLUMN IF EXISTS "schedule";
