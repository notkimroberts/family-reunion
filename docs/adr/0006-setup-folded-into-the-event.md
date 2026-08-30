# ADR 0006 — Setup folded into the event

**Status:** Accepted
**Date:** 2026-08-29
**Amends:** [ADR 0003](./0003-event-scoped-admin-and-owner-only-setup.md)

## Context

[ADR 0003](./0003-event-scoped-admin-and-owner-only-setup.md) created `/admin/setup` as an owner-only
area holding the things an organiser touches rarely: reunion years, tiers and prices, photos, the
storefront, and admin accounts. Five destinations behind one door.

Four of those destinations no longer exist. Photos and the storefront were deleted with the gallery and
the shop ([ADR 0005](./0005-drop-genealogy-and-gallery-tables.md)). `/admin/users` was read-only and had
no form actions — `bun run admin:create` was always the only way to make an admin, so the screen showed
a list nobody could act on. `/admin/setup/events` had two jobs: create a year, and open or close one.

So Setup had become a landing page whose remaining purpose was linking to one form and one per-event
page that the year cards on `/admin` already link to directly.

The two survivors also belonged somewhere more obvious. Creating a year is something you do while
looking at the list of years, which is `/admin`. A year's status — open, closed, draft, archived — is a
property of that year, and every other property of it (dates, venue, tiers, lock date, program) is
already on `/admin/event/[eventId]/settings`. Editing the status somewhere else meant a page that
listed years in order to change one field on one of them, while the page devoted to that year could
only display the field as a read-only badge.

## Decision

**Delete the Setup area.** `/admin/setup`, `/admin/setup/events`, `/admin/users`, and the
`getAdminEvents` / `getAdminUsers` remote functions with the `admin/types.ts` types they returned.

**Creating a year moves to `/admin`**, as a form that opens on demand beside the year cards. It creates
the year in `draft` with Adult and Child tiers at $0 — unchanged behaviour — then navigates to that
year's settings, because a draft with $0 tiers cannot take a registration and the list would not say so.

**A year's status moves to `/admin/event/[eventId]/settings`**, as one button per status with the current
one disabled.

**Owner-only moves with them.** The `create_event` action on `/admin` calls `requireOwner`, and the
settings page already did. `/admin` itself stays `requireAdmin` — it is where `/login` lands.

## Rationale

**A door needs somewhere to lead.** Once four of five links were dead, the Setup landing page was
structure with nothing left to structure. Keeping it would have meant a page whose whole content was
"Reunion years →".

**Put the field on the thing it describes.** The status control listed every year in order to change one
of them, while the page for that year rendered the same field as a badge you could not click. Those two
facts could not both be right.

**One less concept.** ADR 0003's Organizer/Setup split was about getting developer clutter off the
organiser's screen. That is still the goal, but the clutter is gone rather than relocated — deleted with
the features that produced it. The remaining admin is three shapes: the list of years, one year's
registrations, one year's settings.

## Consequences

- `admin/+layout.server.ts` no longer returns `currentEventId`, and drops the query that computed it.
  It answered "which event do links point at when the URL does not name one", which was only ever a
  Setup question — every remaining route except `/admin` carries the id in its path.
- `isOwner` is now computed in two loads: the admin layout, for the registrations page's settings link,
  and `/admin`'s own load, for the create form. A page load cannot read a sibling's return value, and
  the layout's is not in scope for `/admin`'s server-side decisions.
- **Getting back**: the settings page has a breadcrumb (Reunions / year / Settings) and a "← Back to
  registrations" button. With no admin header and no Setup landing, those are the only routes out.
- There is no account-management screen at all. `bun run admin:create` is the only way to create an
  admin, which was already true; the difference is that nothing now implies otherwise.
- `guards.test.ts` still asserts `/admin/setup` is not public. The assertion is about the allowlist, not
  the route: a path that no longer exists must still not become public if someone adds a prefix.
- ADR 0003's owner-only _principle_ stands, and so does its reasoning about never expressing the owner
  as a role. Only the location of the owner-only surface changed.
