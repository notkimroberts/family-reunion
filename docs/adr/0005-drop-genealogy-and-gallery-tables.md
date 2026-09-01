# ADR 0005 — Drop the genealogy, gallery and storefront tables

**Status:** Accepted; the gallery half amended by [ADR 0009](./0009-photos-return-with-a-moderated-gallery.md)
**Date:** 2026-08-29
**Amends:** [ADR 0004](./0004-genealogy-out-of-scope-for-launch.md)
**Amended by:** [ADR 0009](./0009-photos-return-with-a-moderated-gallery.md) — photos and object
storage returned on 2026-09-01, once 290 photographs were recovered from the family's previous site
and there was no longer a launch to protect. The genealogy and storefront decisions here still stand.

## Context

[ADR 0004](./0004-genealogy-out-of-scope-for-launch.md) deleted the genealogy _surface_ and deliberately
kept the genealogy _data_: `family_members`, `relationships` and `party_members.family_member_id` stayed
in the schema, unread, so the feature could return without a data migration. That reasoning depended on
there being real family data to protect.

There is not. The only writer those tables ever had was the family-tree UI, which ADR 0004 deleted, and
`db:seed`, which writes a fictional 100-person tree via faker. Nothing in the app has been able to write
a genealogy row since. So the tables are not insurance — they are three unread tables and a dormant
foreign key on the busiest table in the schema, each needing a paragraph of comment explaining why it is
still there.

The photo gallery is the same shape of thing one step earlier. `/gallery` and `/admin/photos` exist, and
`isPublicPath` already excludes the gallery so only an admin can reach it — the public "View Photos"
button on the landing page was gated behind `role === 'admin'` for exactly that reason. It was slated to
reopen after the reunion. It also carries the app's entire file-upload surface: Cloudflare R2, two AWS
SDK packages, five environment variables, and the only code path that writes a byte anywhere other than
Postgres.

Launch is imminent. Every one of those is a thing that can break or be misconfigured in service of a
feature nobody is using on launch day.

## Decision

**Drop the tables.** `family_members`, `relationships`, `photos`, and `party_members.family_member_id`,
in `drizzle/0011_parched_lady_mastermind.sql`.

**Delete the gallery and the storage layer.** `/gallery`, `/admin/photos`, `getAdminPhotos.remote.ts`,
`$lib/server/storage`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, the `R2_*` variables, and
the `Photo` type. The Setup landing loses its Photos card, and `PRIMARY_NAV_LINKS` — the "Family" nav
group, whose only remaining member was the commented-out gallery link — goes with it.

**Accept that this is one-way.** Whatever is in those tables is gone, and so is anything in the R2
bucket, because `photos.r2_key` was the only pointer to those objects.

## Rationale

**A kept table is not a kept feature.** ADR 0004's plan was that genealogy could return "without a data
migration". But it cannot return without a migration in any case: it needs the linking screen, the
chart, the relationship enum, and a decision about what the tree is _for_ — and by then the schema will
have moved. The saving was one `CREATE TABLE` against a permanent cost in comments, seed code, and
schema noise.

**Photos are a solved problem elsewhere.** A shared album on a service the family already uses needs no
bucket, no credentials, no upload UI, and no admin screen for deleting things. The gallery was a
worse version of something free, carrying the app's only non-Postgres write path to do it.

**The R2 surface was the real cost.** Five environment variables that must be right in production, two
SDK packages in the bundle, and an upload action whose `requireAdmin` guard had to be reasoned about
separately because layout loads do not protect actions. All of it in service of a page hidden behind an
admin login.

## Consequences

- Nothing in the app uploads a file. If that changes, it needs a new storage module and its own ADR.
- The five `R2_*` Railway variables should be deleted, and the bucket emptied by hand if its contents
  matter — after the migration runs there is nothing left that can enumerate those objects.
- **Check `SELECT count(*) FROM photos` before applying the migration.** Locally it will be non-zero,
  because the old seed generated rows; that is fine and expected. In production a non-zero count means
  real uploads, and those objects become unreachable.
- The migration was hand-edited: drizzle-kit generated `DROP TABLE family_members CASCADE` followed by an
  `ALTER TABLE party_members DROP CONSTRAINT` for a constraint the CASCADE had already removed, which
  fails and would abort the deploy. It is reordered dependency-first with `IF EXISTS` throughout.
- ADR 0004's "the genealogy data is kept" clause is superseded. Its other decisions — the deleted
  surface, and Bookings/People as two lenses on one page — still stand.

## Addendum, same day — the storefront

The shop was cut on the same reasoning, in `drizzle/0012_smart_hairball.sql`: `/shop`,
`/admin/storefront`, the `StorefrontProduct` type, and `reunion_events.external_shop_url`,
`shop_products` and `shop_active`.

It was a link to an external store plus a JSONB list of shirts to display. **Nothing was ever sold
through this app** — no order, payment or refund referenced any of it — so unlike the photos there is
not even an external artifact to orphan. Copy `external_shop_url` out first if it points somewhere
real; that is the only content worth keeping.

Shirt sizes are unaffected. They are collected during registration, stored on `party_members`, and
counted in the admin order sheet, which is the part of "merchandise" that a reunion actually needs.

This also emptied both nav arrays. `PRIMARY_NAV_LINKS` held only the gallery and `SECONDARY_NAV_LINKS`
only the shop, so the "Family" and "Reunion" dropdowns in `AppHeader` — and their counterpart sections
in `MobileDrawer` — were rendering nothing behind an `{#if …length}` guard. Both constants, both
dropdowns and the drawer's now-unreachable `iconMap` are deleted. The nav is logo · Contact · Register
· theme · account.
