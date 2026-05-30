# Family Reunion

A full-stack app for organising family reunion events: registration and payment, a family genealogy tree, and a photo gallery. Three distinct sub-domains share the codebase — identity, genealogy, and events — each with its own model of a "person."

## Language

### Identity

**User**:
A person who has signed in via SSO or magic link. Managed entirely by Better Auth (`user`, `session`, `account` tables). The source of truth for authentication.
_Avoid_: account, member

**User profile**:
App-level extension of a **User** — one per user, created automatically on first sign-in. Stores contact details (phone, mailing address), birth date, and profile photo URL. Identified by `userId` (FK to `user.id`).
_Avoid_: profile, account settings

**Admin**:
A **User** with `role = 'admin'`. Granted via the Better Auth admin plugin; checked by `requireAdmin()` in guards.

### Genealogy

**Family member**:
A node in the genealogy tree. May or may not be linked to a **User** (`userId` is nullable, stored as a plain text column with no enforced FK). Ancestors, deceased relatives, and people who have never signed in are valid family members. Birth date is stored as separate `birthYear`, `birthMonth`, `birthDay` integers to accommodate partial or historical dates.
_Avoid_: person, relative

**Relationship**:
A typed, directed edge between two **family members** (`fromMemberId` → `toMemberId`). Both directions are stored explicitly when needed (e.g. a parent→child edge and a child→parent edge are separate rows).

**Family tree**:
The full graph of **family members** and **relationships**. Rendered as an interactive chart on desktop; as a flat list on mobile.

### Events & Registration

**Reunion event**:
A single annual gathering. Has a status lifecycle: `draft` → `open` → `closed` → `archived`. Exactly one event is `open` at a time during the registration window.
_Avoid_: event (too generic in a SvelteKit codebase — `event` means `RequestEvent`)

**Pricing tier**:
An age bracket with a price in cents, scoped to a **reunion event**. Each **party member** is assigned one tier at registration time; the tier FK is the source of truth for what was charged.

**Registration**:
A record of a **user**'s intent (or payment) to attend a **reunion event**. Status: `pending` → `paid` (or `refunded` or `waived`). Holds the Stripe session ID and total amount. One user may have at most one registration per event.
_Avoid_: booking, sign-up

**Registrant**:
The **User** who creates and submits the registration form. They are always the first `party_members` row for a registration; the link is implicit via `registration.userId`. Shown with a "You" badge in the UI. There is no explicit column in `party_members` that marks a row as the registrant — the connection runs through the parent `registrations.userId`.
_Avoid_: party member, attendee

**Guest member**:
An additional attendee added by the **Registrant** during or after registration. Stored in `party_members` alongside the registrant but has no link to a **User**, **user profile**, or **family member**. Need not have an app account or a genealogy record.
_Avoid_: guest (too vague), party member, attendee

**Contact**:
A free-text name and email stored on a **registration** (`contactName`, `contactEmail`). Used for admin-created registrations where no **user** account exists and for confirmation emails.

### Three person models — why they're separate

The app has three distinct ways of representing a person. This is intentional:

| Model                             | Table                    | User FK?                              | Purpose                                                                     |
| --------------------------------- | ------------------------ | ------------------------------------- | --------------------------------------------------------------------------- |
| **User** + **User profile**       | `user` + `user_profiles` | required                              | Authentication and contact details for people who sign in                   |
| **Family member**                 | `family_members`         | optional (nullable, no DB constraint) | Genealogy — includes historical figures and relatives who may never sign in |
| **Registrant** + **Guest member** | `party_members`          | none                                  | Attendance at a specific event — the registrant and any guests they add     |

**Key invariants:**

- A **user profile** always exists for every **user** — created atomically via a Better Auth `databaseHooks.user.create.after` hook on first sign-in.
- A **family member** can be linked to a **user** by setting `familyMembers.userId` to `user.id`, but this is not enforced by a DB-level FK. The family tree left-joins `user_profiles` on this column to pull in profile photos.
- Neither the **registrant** nor any **guest member** has a link to `user_profiles` or `family_members`. The registrant's identity is inferred through `registration.userId`; guest members have no user link at all. Someone can attend a reunion as a guest without being in either system.
- All three person models store birth dates as split integers — `birthYear`, `birthMonth`, `birthDay` — to accommodate partial and historical dates (e.g. known year, unknown day). Age is always derived via `getAge()` from `$lib/utils/age`.

## Example dialogue

> **Dev**: If I add someone to the family tree, does that create a registration entry for them?
>
> **Domain**: No — the family tree and event registration are completely separate. Adding a family member just adds a genealogy node. They'd need to be added to a registration as a guest member (or register themselves as a registrant) to attend.

> **Dev**: When a user signs up and registers for the reunion, how many "person" records are we creating?
>
> **Domain**: Three potentially. The SSO sign-in creates a `user` record (Better Auth) and triggers the hook that creates a `user_profile`. The registration creates a `registration` and at least one `party_members` row — the registrant themselves. Their family tree entry, if any, is separate and only created if they go to the family tree page and add themselves.

> **Dev**: Can I look up a guest member's user profile to get their email?
>
> **Domain**: No — there's no FK. Guest members (and registrants too, within the `party_members` table) have no direct link to `user_profiles`. You'd go through `registration.userId` to get the registrant's email. The guest's data is limited to what was entered in the form (name, birth date, shirt size).

## Flagged ambiguities

**"member"** is overloaded: the codebase uses `familyMembers`, `partyMembers`, and Better Auth's implicit "member" concept. Always qualify with context: **family member**, **registrant**, or **guest member**. Never use bare "member."

**`familyMembers.userId` non-FK**: The `userId` column on `family_members` is a plain `text` column with no DB-level FK constraint to `user.id`. This supports the genealogy use case (historical figures, deceased relatives who never had an account) but means app-level consistency is not enforced. Whether to add a DB-level FK (with `ON DELETE SET NULL`) is pending deeper investigation of how the genealogy and identity sub-domains relate to each other.
