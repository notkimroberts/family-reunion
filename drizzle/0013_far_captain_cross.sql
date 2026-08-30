-- Folds the six program-content columns on reunion_events into one `metadata` jsonb column.
--
-- Part one of two: add the column and backfill it. 0014 drops the originals, so the two files must
-- stay in this order — dropping first would lose the content this UPDATE is copying.
--
-- The six columns (venue, menu, drinks, recommended_sites, recommended_activities, schedule) were
-- never predicates: nothing filtered, ordered, joined or indexed on any of them. They existed only
-- to be rendered on /program plus two venue lines in the confirmation email. See ADR 0007.
--
-- Three deliberate changes in the backfill, since the shape is being rewritten anyway:
--   * recommended_sites      -> sites
--   * recommended_activities -> activities
--   * venue loses `imageUrl` and `url` (on site entries) — both were in the old TypeScript types and
--     rendered by nothing. The metadata zod schema is strict(), so leaving them in place would make
--     the first save of an untouched event fail validation.
--
-- jsonb_strip_nulls is what keeps an event with no menu from storing {"menu": null}: jsonb_build_object
-- would otherwise write the key with a JSON null, and every reader tests key presence.

ALTER TABLE "reunion_events" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

UPDATE "reunion_events" SET "metadata" = jsonb_strip_nulls(
	jsonb_build_object(
		'venue', "venue" - 'imageUrl',
		'menu', "menu",
		'drinks', "drinks",
		'sites', (
			SELECT jsonb_agg(site - 'url')
			FROM jsonb_array_elements("recommended_sites") AS site
		),
		'activities', "recommended_activities",
		'schedule', "schedule"
	)
);
