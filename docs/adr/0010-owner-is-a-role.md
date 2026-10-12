# ADR 0010 — The owner is a role, now that nothing an organizer can reach writes one

**Status:** Accepted
**Date:** 2026-10-12
**Supersedes:** "Setup is restricted by identity, never by role" in [ADR 0003](./0003-event-scoped-admin-and-owner-only-setup.md)

## Context

ADR 0003 made the owner an email match against `OWNER_EMAIL`, because a role could not be a boundary:
Better Auth's `admin()` plugin mounts `/api/auth/admin/*` ahead of SvelteKit routing, and any admin
could `set-role` themselves.

That reasoning was right, and the hole was wider than it said. Better Auth 1.7.2 grants the default
`admin` role `set-role`, `set-password`, `delete`, `ban`, `create` and `update` (email included) on
**any** account. So any organizer could reset the owner's password, delete the owner, or move the
owner's email onto their own account and pass the identity gate. Verified: an organizer's
`POST /api/auth/admin/set-role` answered 200.

Organizers could also cancel and refund registrations, remove attendees, change or waive payment status,
and permanently delete photos. The family wants those with one site admin, so a well-meaning organizer
cannot break something that cannot be undone.

## Decision

- **Remove the `admin()` plugin.** The app called none of its endpoints; the `admin:*` scripts are the
  account tools. Declare `role` in `user.additionalFields` with `input: false`, so `/update-user`
  refuses it.
- **Two role values.** `'admin'` stays the organizer value — every existing row and live session cookie
  holds it, so nothing migrates. `'owner'` is new. `hasAdminAccess` accepts both; `isOwner` /
  `requireOwner` accept `'owner'` only. No bare `role === 'admin'` comparison remains.
- **`bun run admin:set-role <email> <owner|organizer>` is the only writer**, and revokes the account's
  sessions.
- **Owner-only:** everything ADR 0003 called Setup, plus cancel, remove attendee, change payment status,
  paper entry as `waived`, and photo delete. Mixed actions refuse the owner-only part before writing.
- **Fail closed.** No owner row means no owner screens until the script runs. `OWNER_EMAIL` is no longer
  read.

## Rationale

- ADR 0003's objections to a role were all about the surroundings, not the idea: two hard-coded
  `role === 'admin'` gates (now one helper), `admin({ adminRoles })` throwing (the plugin is gone), and
  self-service `set-role` (the endpoint is gone). With those gone, a role allows more than one owner and
  is testable as data.
- Fail-open was right for a variable that could be forgotten on Railway. A role is a database row that a
  tested script writes; locking out is recovered in one `railway ssh` command, and failing open would
  hand every organizer the refund button.

## Consequences

- **After deploy, run `admin:set-role <email> owner` on production** before the owner needs settings.
- Marking a check as received (`pending` → `paid`) is now the owner's job. Paper entry as `paid` is not.
- `adminApi.test.ts` pins both halves against a real request. Adding the admin plugin back reopens the
  hole.
