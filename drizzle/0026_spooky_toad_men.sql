CREATE TYPE "public"."member_settlement" AS ENUM('paid', 'covered');--> statement-breakpoint
ALTER TABLE "party_members" ADD COLUMN "settlement" "member_settlement";