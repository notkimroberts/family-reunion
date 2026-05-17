ALTER TABLE "user_profiles" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "birth_date" date;--> statement-breakpoint
UPDATE "party_members" SET "birth_date" = MAKE_DATE("birth_year", COALESCE("birth_month", 1), COALESCE("birth_day", 1));--> statement-breakpoint
ALTER TABLE "party_members" ALTER COLUMN "birth_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN "birth_year";--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN "birth_month";--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN "birth_day";
