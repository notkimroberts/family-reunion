CREATE TYPE "public"."registration_audit_action" AS ENUM('status_changed', 'member_added', 'member_updated', 'member_removed', 'contact_updated', 'link_reissued');--> statement-breakpoint
CREATE TABLE "registration_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"actor_user_id" text,
	"action" "registration_audit_action" NOT NULL,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "previous_management_token" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "previous_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "registration_audit" ADD CONSTRAINT "registration_audit_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_audit" ADD CONSTRAINT "registration_audit_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_audit_registration_id_idx" ON "registration_audit" USING btree ("registration_id");--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_previous_management_token_unique" UNIQUE("previous_management_token");