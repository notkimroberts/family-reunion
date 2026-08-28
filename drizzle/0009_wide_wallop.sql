-- Hand-edited. Drizzle generated only the column and the index, which would leave every existing
-- registration with no contact row flagged — the admin edit view would show no contact attendee at all.
-- Both creation paths already insert the contact first, so the earliest row per registration is that
-- person.
--
-- Safe to edit rather than stack a correction on top: applied to no environment, so no recorded hash
-- can disagree with it.
ALTER TABLE "party_members" ADD COLUMN "is_contact" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Earliest member per registration is the contact. id breaks a created_at tie so the choice is
-- deterministic rather than dependent on physical row order.
UPDATE "party_members" pm
   SET "is_contact" = true
  FROM (
        SELECT DISTINCT ON ("registration_id") "id"
          FROM "party_members"
         ORDER BY "registration_id", "created_at" ASC, "id" ASC
       ) AS first_member
 WHERE pm."id" = first_member."id";--> statement-breakpoint

-- Make the two names agree. registrations.contact_name wins: it is what the confirmation and recovery
-- emails and the registrations list have already shown, so it is the version people have seen. From
-- here updateRegistrationContact is the single writer of both, so they cannot drift again.
UPDATE "party_members" pm
   SET "name" = r."contact_name"
  FROM "registrations" r
 WHERE pm."registration_id" = r."id"
   AND pm."is_contact"
   AND pm."name" <> r."contact_name";--> statement-breakpoint

-- After flagging, so the constraint is proven against the data it will govern rather than only future
-- writes.
CREATE UNIQUE INDEX "party_members_one_contact_per_registration" ON "party_members" USING btree ("registration_id") WHERE "party_members"."is_contact";
