-- Drops the genealogy tables (family_members, relationships), the photo gallery table (photos), and
-- party_members.family_member_id.
--
-- HAND-EDITED, because drizzle-kit generated this in an order that cannot run. It emitted
-- `DROP TABLE "family_members" CASCADE` and then, four statements later,
-- `ALTER TABLE "party_members" DROP CONSTRAINT "party_members_family_member_id_family_members_id_fk"`.
-- The CASCADE has already removed that constraint by then, so the ALTER fails with "constraint does
-- not exist" — aborting the migration and, on Railway, the deploy. Verify by checking
-- drizzle.__drizzle_migrations before touching this file again: it had not been applied anywhere when
-- it was rewritten, which is the only state in which editing a migration is safe.
--
-- Order here is dependency-first and every drop is IF EXISTS, so the file is safe to re-run and does
-- not depend on which statement removed the constraint. No CASCADE: after the FK below is gone,
-- nothing should reference these tables, and a surprise dependent should fail loudly rather than be
-- silently dropped along with them.
--
-- THIS DESTROYS DATA. The r2_key column in photos is the only pointer to the objects in the R2
-- bucket, so any rows here become orphaned objects that nothing can enumerate. Check before applying:
--   SELECT count(*) FROM photos;
--   SELECT count(*) FROM family_members;
-- and empty the bucket separately if the first is non-zero.

ALTER TABLE "party_members" DROP CONSTRAINT IF EXISTS "party_members_family_member_id_family_members_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "party_members_family_member_id_idx";--> statement-breakpoint
ALTER TABLE "party_members" DROP COLUMN IF EXISTS "family_member_id";--> statement-breakpoint
DROP TABLE IF EXISTS "relationships";--> statement-breakpoint
DROP TABLE IF EXISTS "family_members";--> statement-breakpoint
DROP TABLE IF EXISTS "photos";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."relationship_type";
