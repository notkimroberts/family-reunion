# Family Reunion

A full-stack app for organising family reunion events: registration and payment, a family genealogy tree, and a photo gallery. Three distinct sub-domains share the codebase — identity, genealogy, and events — each with its own model of a "person."

## Language

### Identity

**User**:
An organiser who signs in with email and password at `/login`. Managed entirely by Better Auth (`user`, `session`, `account` tables). Users exist only to administer the app — attendees never have one.
_Avoid_: account, member, registrant

**Admin**:
A **User** with `role = 'admin'`. Granted via the Better Auth admin plugin; checked by `requireAdmin()` in guards. In practice every user is an admin: there is no non-admin reason to sign in.

> There is no app-level profile table. An earlier design had `user_profiles` holding contact details per user; it was removed along with magic-link sign-in when registration became public. Contact details now live on the **registration**.

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

**Event metadata**:
Everything a **reunion event** _displays_ — venue, menu, drinks, sites, activities, schedule — in one `metadata` jsonb column rather than one column each ([ADR 0007](docs/adr/0007-event-content-in-one-metadata-column.md)). The dividing line is whether the database is ever asked a question about it: the remaining columns (`status`, `year`, the dates, `registration_lock_date`) are all filtered, ordered or indexed on; metadata is only ever fetched whole and rendered. Shape and validation live in `$lib/general/reunionMetadata`; the owner edits it as raw JSON on the settings page. Not to be confused with the homepage's `REUNION_LOCATIONS` constants, which are deliberately not per-year.
_Avoid_: event details, config, settings

**Pricing tier**:
A named price bracket in cents, scoped to a **reunion event** (`tiers`). A tier is chosen per **party member** at registration time, but the tier is _not_ the record of what was charged: `party_members` snapshots `tierLabel` and `priceCents` onto the row, so renaming or repricing a tier never rewrites history or a refund amount.

**Registration**:
One party's record of attending a **reunion event**, owned by a **management token** rather than by a user. Status: `pending` → `paid`, or `waived` (comped / paid offline) or `refunded` (cancelled). Holds the Stripe session ID; there is no denormalised total — the amount is the sum of its **party members**' `priceCents`.
_Avoid_: booking, sign-up

**Management token**:
The credential that owns a **registration** — 32 random bytes, base64url. The only credential: registration is fully public and there is no per-request auth check on `/register/manage`. The database stores only `sha256(token)`, so the plaintext exists exactly twice — in the URL sent to the registrant, and in Stripe session metadata so the webhook can build the manage link. It cannot be recovered, only rotated, which is why `/register/recover` must not rotate before a confirmed email delivery.
_Avoid_: password, API key

**Contact**:
The name, email and optional phone stored directly on a **registration** (`contactName`, `contactEmail`, `contactPhone`). This is the whole identity of whoever registered — there is no **user** behind it. Confirmation and recovery email go here. These stay on the registration rather than moving onto `party_members`: the email is the booking's credential-recovery key and has to outlive any single attendee row, which a registrant can delete. See [ADR 0008](docs/adr/0008-contact-stays-on-the-registration.md).

**Registrant**:
The person the **contact** describes. They are the `party_members` row flagged `isContact` — inserted from the form's `self*` fields, or first in the list on admin paper entry. Their `name` is a second copy of `contactName` by design, with `updateRegistrationContact` as the single writer of both; a partial unique index enforces at most one flagged row per registration.
_Avoid_: party member, attendee, user

**Guest member**:
An additional attendee added by the **registrant** during or after registration. Stored in `party_members` alongside the registrant. Has no link to a **user** or **family member**, and need not have either.
_Avoid_: guest (too vague), party member, attendee

### Three person models — why they're separate

The app has three distinct ways of representing a person. This is intentional:

| Model                             | Table            | Identified by                        | Purpose                                                                     |
| --------------------------------- | ---------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| **User**                          | `user`           | email + password (Better Auth)       | Organisers signing in to administer the app                                 |
| **Family member**                 | `family_members` | optional `userId` (no DB constraint) | Genealogy — includes historical figures and relatives who may never sign in |
| **Registrant** + **Guest member** | `party_members`  | parent `registrations` row           | Attendance at a specific event — the registrant and any guests they add     |

**Key invariants:**

- A **registration** is reached by **management token**, never by a user session. An attendee needs no account, and an organiser signing in gains no automatic view of their own registration.
- A **family member** can be linked to a **user** by setting `familyMembers.userId`, but this is not enforced by a DB-level FK.
- A **party member** may optionally be linked to a **family member** via `partyMembers.familyMemberId` (admin-set, `ON DELETE set null`) — the one bridge between attendance and genealogy. It is nullable and usually null: someone can attend without being in the tree, and be in the tree without attending.
- All three person models store birth dates as split integers — `birthYear`, `birthMonth`, `birthDay` — to accommodate partial and historical dates (e.g. known year, unknown day). A CHECK constraint enforces prefix consistency: day implies month, month implies year. Age is always derived via `getAge()` from `$lib/utils/age`.

## Example dialogue

> **Dev**: If I add someone to the family tree, does that create a registration entry for them?
>
> **Domain**: No — the family tree and event registration are completely separate. Adding a family member just adds a genealogy node. They'd need to be added to a registration as a guest member (or register themselves as a registrant) to attend.

> **Dev**: When someone registers for the reunion, how many "person" records are we creating?
>
> **Domain**: One `registration` plus one `party_members` row per person in the party — the registrant is the first of those. No `user` is created: registration is public and creates no account. Their family tree entry, if any, is entirely separate.

> **Dev**: Can I look up a guest member's email?
>
> **Domain**: No. Only the **contact** has an email, and it lives on the parent `registrations` row. A guest member's data is limited to what the form collected — name, birth date, shirt size, address, and the two questions. If you need to reach a guest, you reach the contact.

> **Dev**: Someone lost their management link. Can I look up their old one?
>
> **Domain**: No — the database only has `sha256(token)`. `/register/recover` generates a _new_ token and emails it, which invalidates the old one. That is why the rotation only commits after the email send is confirmed: rotating on a failed send locks the registrant out permanently.

## Flagged ambiguities

**"member"** is overloaded: the codebase uses `familyMembers`, `partyMembers`, and Better Auth's implicit "member" concept. Always qualify with context: **family member**, **registrant**, or **guest member**. Never use bare "member."

**`familyMembers.userId` non-FK**: The `userId` column on `family_members` is a plain `text` column with no DB-level FK constraint to `user.id`. This supported the genealogy use case (historical figures, deceased relatives who never had an account) but means app-level consistency is not enforced. Now that users are organisers only, it is unclear this column has any remaining purpose — resolve whether to drop it rather than constrain it.

**"registration" as status vs. record**: `registrations.status` is `pending` for a row whose Stripe checkout has not completed, so an abandoned checkout leaves a permanent `pending` row that is not a registration in any meaningful sense. These are deliberately not cleaned up (deleting by contact email would let anyone clobber a stranger's in-flight checkout). When counting registrations, filter on `paid`/`waived`.
