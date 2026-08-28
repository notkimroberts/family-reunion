# ADR 0004 — Genealogy is out of scope for launch

**Status:** Accepted  
**Date:** 2026-08-28  
**Amends:** [ADR 0003](./0003-event-scoped-admin-and-owner-only-setup.md)

## Context

The app carried two products at once. One collects registrations and money for a reunion; the other is a
family tree — `/family-tree`, a d3 chart, 26 relationship types, and an admin screen whose only job was
linking each attendee to their canonical tree node. Launch is in three days, and only the first product
has to work.

The genealogy half was also the least finished. The linking screen had one action and no search; nothing
flagged a person already linked in another year; and the cross-year view that justified its shape was
never built.

## Decision

**The genealogy surface is deleted.** Routes, components, the linking action, its query, and the
`family-chart` + `d3` dependencies. Registration and attendance are the whole product.

**The genealogy _data_ is kept.** `family_members`, `relationships` and `party_members.family_member_id`
stay in the schema, unread. No migration, and nothing is dropped.

**Registrations and Attendees stop being two destinations.** They are two lenses on one page,
`/admin/event/[eventId]/registrations`, switched by a **Bookings / People** toggle carried in `?view=`.

## Rationale

- **Deleting the surface is reversible; deleting the data is not.** A dropped table takes any real
  genealogy already entered with it, and nobody can say from here whether production holds real family
  members or only what `db:seed` invents. Keeping three unread objects costs nothing and keeps the door
  open, which is what "we'll add that back later" requires.
- **The two lenses were never two jobs.** Bookings is one row per party — who owes what, who to chase.
  People is one row per attendee, which is what catering, shirt counts and name badges come off. Same
  event, same query scope, different grain. As separate tabs the second one was named after its contents
  while being used for its one action; with the action gone, a tab of its own could not be justified.
- **A toggle keeps both a click away.** A party of six is one row in Bookings and six chairs in People,
  and an organiser needs both readings within the same minute.
- **`?view=` is safe where `?eventId` was not.** ADR 0003 removed a search param because two pages
  disagreed about what its absence meant. This one is scoped to a single route and means nothing
  anywhere else; it is in the URL only so the lens survives a reload and a trip into a registration.

## Consequences

- **`/family-tree` and `/admin/event/[eventId]/attendees` now 404**, where they previously redirected to
  `/login` or rendered. Any bookmark is dead.
- **Nothing can set `party_members.family_member_id` any more.** Existing values remain; new party
  members get `null`. If genealogy returns, the linking UI returns with it.
- **The Organizer tab row is gone from `AdminHeader`** — Organizer is a single destination, and a nav bar
  with one item in it is furniture.
- **People shows `paid` and `waived` only.** A pending registration is not an attendee yet and a refunded
  one is not one any more; including either would inflate every count read off that list. Unpaid parties
  are chased in Bookings, which is why the status filter chips appear only there.
- **`db:seed` still generates a fictional family tree.** Left alone deliberately: it writes to tables
  that still exist, nothing reads them, and rewriting the seed three days before launch risks
  `db:reseed`, which is the only local reset path.
