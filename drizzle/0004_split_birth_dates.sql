ALTER TABLE "user_profiles" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "birth_month" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "birth_day" integer;--> statement-breakpoint
UPDATE "user_profiles" SET "birth_year" = EXTRACT(YEAR FROM "birth_date"::date)::integer, "birth_month" = EXTRACT(MONTH FROM "birth_date"::date)::integer, "birth_day" = EXTRACT(DAY FROM "birth_date"::date)::integer WHERE "birth_date" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "birth_date";--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "birth_month" integer;--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "birth_day" integer;--> statement-breakpoint
UPDATE "party_members" SET "birth_year" = EXTRACT(YEAR FROM "birth_date"::date)::integer, "birth_month" = EXTRACT(MONTH FROM "birth_date"::date)::integer, "birth_day" = EXTRACT(DAY FROM "birth_date"::date)::integer WHERE "birth_date" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN "birth_date";
