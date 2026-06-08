ALTER TABLE "user_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "contact_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "management_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_management_token_unique" UNIQUE("management_token");