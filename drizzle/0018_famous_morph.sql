CREATE TYPE "public"."hotel_stay" AS ENUM('yes', 'no', 'undecided');--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "staying_at_host_hotel" "hotel_stay";