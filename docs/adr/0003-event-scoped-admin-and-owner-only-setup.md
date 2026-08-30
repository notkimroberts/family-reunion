# ADR 0003 — The admin is event-scoped, and Setup is owner-only by identity

**Status:** Accepted, with one part superseded  
**Date:** 2026-08-28  
**Amended:** 2026-08-29 — `/admin` is a landing page listing the reunions, **not** a redirect. See
"Consequences".

## Context

The admin area grew one page at a time and ended up shaped like its own history rather than like the
job. Three days before launch it offered:

- **Seven sidebar destinations** — Dashboard, Events, Users, Photos, Registrations, Attendees,
  Storefront — for an area with two recurring tasks.
- **A row of year pills** driven by `?eventId`, where "All years" was the _absence_ of the parameter.
  The control appeared on five routes and not on two others, and the two halves of the app disagreed
  about what an absent parameter meant: the registrations list resolved it to the open event, the shell
  resolved it to "all years". Clicking Registrations and then Attendees silently widened from one
  reunion to every year, with the pills still highlighting "All years".
- **The public marketing header above every admin page**, Register call-to-action and footer included,
  because admin renders inside the `(app)` route group. Having no top of its own is why the theme toggle
  and sign-out ended up stranded at the bottom of the sidebar.
- **A dashboard whose headline number was Total Users** — a figure with no bearing on a reunion — and
  which sat between the organiser and the registration list they actually came for.

Three UI variants were prototyped on `/admin?variant=` and thrown away; the verdict is recorded in the
commit that removed them.

## Decision

**One event at a time, named in the URL.** `/admin/event/[eventId]/registrations`, `/…/attendees`,
`/…/settings`. `/admin` lists the reunions and links into one of them, and says so plainly when there are
none, so a fresh production database cannot dead-end. (It was briefly a redirect — see "Consequences".)
`?eventId`, the "All years" pill, `SELECTOR_PATHS`, `navHref()` and the `admin` Svelte context are all
deleted.

**Two modes, not two roles.** Organizer holds Registrations and Attendees. Setup holds event details,
tiers and prices, reunion years, photos, storefront and admin accounts. Everyone who can sign in is
still `role='admin'`.

**Setup is restricted by identity, never by role.** `requireOwner` layers an `OWNER_EMAIL` check on top
of `requireAdmin`. It **fails open** when the variable is unset, and reports that once.

**An event's status is a banner, not a badge**, rendered once by the event layout for every child view.
`draft`, `closed` and `archived` each get one; `open` gets nothing.

## Rationale

- **Only one event can be open at a time** — the `one_open_event` partial unique index — so "which
  reunion am I looking at" has an unambiguous default and never needed "All years" as a peer of a year.
  What looked like a navigation control was a reporting filter.
- **Putting the id in the path removes the disagreement rather than resolving it.** With no parameter to
  be absent, two files cannot interpret its absence differently. It also deletes more code than it adds.
- **Role could not carry the owner distinction.** Two independent hard-coded `role === 'admin'`
  comparisons gate the app — `requireAdmin`, and the `(app)` group layout — so an owner with any other
  role value would lose `/admin`, `/family-tree`, `/gallery`, `/shop` and `/program`. Better Auth's
  `admin({ adminRoles: [...] })` does not degrade either; it throws at plugin construction, and auth is
  lazily initialised, so that surfaces on every request including public pages.
- **Role is self-service.** Better Auth mounts `POST /api/auth/admin/set-role` ahead of SvelteKit
  routing. Its only check is that the caller is an admin; there is no self-target guard. Any admin can
  already grant themselves any role, so a role-keyed owner gate would be decoration.
- **Identity is the one thing that cannot be edited from inside the app**, which is what makes it a
  usable gate for one person.
- **Fail-open is the right direction here, and it is a trade, not an oversight.** The degraded state is
  the previous behaviour: admins only, never the public, because the group layout still requires
  `role='admin'`. Failing closed would mean one forgotten Railway variable locks the owner out of their
  own event settings and pricing days before a launch. Wrong-but-recoverable beats right-but-bricked.
- **Three of the four event statuses mean nobody can register**, including `draft`, which leaves
  `/register` with no event at all. That is the state most worth a warning and the one a badge is most
  easily scanned past. `open` shows nothing, because a banner that is always present is a banner nobody
  reads.

## Consequences

- **`/admin` is no longer a page.** The old dashboard's year-on-year comparison is gone with it; the
  numbers an organiser reads now sit beside the registration list, per event. A cross-year view, if
  wanted, needs a new home.

  > **Superseded, 2026-08-29.** `/admin` is a page again — a landing page listing the reunions, one card
  > per year with its head count and money. The redirect was wrong twice over: it made the other years
  > invisible, which is exactly the cross-year view this consequence said needed a new home, and it made
  > the sign-in destination depend on which event happened to be open, a state that changes twice a year.
  > The rest of this ADR stands: every working view is still event-scoped, and `/admin` navigates to one
  > rather than showing a dashboard of its own.

- **`/admin/event/[eventId]/attendees` changed behaviour, not just location.** It previously shipped
  every paid attendee of every reunion and filtered in the browser. The cross-year reading that appeared
  to justify that was never implemented — year was the first sort key, so the same cousin's rows sat as
  far apart as possible, and nothing flagged one as already linked. The genuine cross-year view lives on
  the family-tree node.
- **A registration must belong to the event in its URL**, enforced in the load and in every action,
  because each re-fetches independently. Before, the lookup was global.
- **`requireOwner` has to be called in seventeen places** — every Setup load, every action, and all
  three remote functions. Remote functions are served from `/_app/remote/<id>` with route handling
  skipped, so no layout or page guard covers them; the in-function guard is the entire protection.
- **`OWNER_EMAIL` must be set in Railway** for Setup to be restricted at all. Unset is a working
  configuration, not a broken one, which is exactly why it is reported to Sentry.
