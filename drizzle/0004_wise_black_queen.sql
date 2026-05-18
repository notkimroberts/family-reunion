ALTER TYPE "public"."registration_status" ADD VALUE 'waived';--> statement-breakpoint
ALTER TABLE "party_members" ALTER COLUMN "birth_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "contact_email" text;