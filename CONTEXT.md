# Family Reunion

A full-stack app for one job: taking registrations and money for a family reunion. Two sub-domains share the codebase — identity (the organisers who administer it) and events (the reunion, its prices, and who is coming) — each with its own model of a "person."

> An earlier version of this app also carried a genealogy tree and a storefront. Both are deleted, tables included — see [ADR 0004](docs/adr/0004-genealogy-out-of-scope-for-launch.md) and [ADR 0005](docs/adr/0005-drop-genealogy-and-gallery-tables.md). **Family member** and **relationship** are no longer terms in this domain. Do not reintroduce them by reflex on finding a dangling reference.
>
> The photo gallery was deleted alongside them and has since returned — see [ADR 0009](docs/adr/0009-photos-return-with-a-moderated-gallery.md). **Photo** is a term again; the two it sat beside are not.

## Language

### Identity

**User**:
An organiser who signs in with email and password at `/login`. Managed entirely by Better Auth (`user`, `session`, `account` tables). Users exist only to administer the app — attendees never have one.
_Avoid_: account, member, registrant

**Admin**:
A **User** with `role = 'admin'`. Granted via the Better Auth admin plugin; checked by `requireAdmin()` in guards. In practice every user is an admin: there is no non-admin reason to sign in.

> There is no app-level profile table. An earlier design had `user_profiles` holding contact details per user; it was removed along with magic-link sign-in when registration became public. Contact details now live on the **registration**.

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

**Audit entry**:
An append-only row in `registration_audit` recording an **admin** change to someone else's **registration** — status change, member added / updated / removed, contact updated, link reissued. Written only by the admin paths, never by the registrant's own. It exists because several organisers share the admin panel and `updated_at` cannot say who acted. The actor's name is snapshotted alongside the FK so deleting an organiser's account does not erase the history.
_Avoid_: log, event (see **Reunion event**), history

**Management token**:
The credential that owns a **registration** — 32 random bytes, base64url. The only credential: registration is fully public and there is no per-request auth check on `/register/manage`. The database stores only `sha256(token)`, so the plaintext exists exactly twice — in the URL sent to the registrant, and in Stripe session metadata so the webhook can build the manage link. It cannot be recovered, only rotated, which is why `/register/recover` must not rotate before a confirmed email delivery.
_Avoid_: password, API key

**Contact**:
The name, email and optional phone stored directly on a **registration** (`contactName`, `contactEmail`, `contactPhone`). This is the whole identity of whoever registered — there is no **user** behind it. Confirmation and recovery email go here. These stay on the registration rather than moving onto `party_members`: the email is the booking's credential-recovery key and has to outlive any single attendee row, which a registrant can delete. See [ADR 0008](docs/adr/0008-contact-stays-on-the-registration.md).

**Registrant**:
The person the **contact** describes. They are the `party_members` row flagged `isContact` — inserted from the form's `self*` fields, or first in the list on admin paper entry. Their `name` is a second copy of `contactName` by design, with `updateRegistrationContact` as the single writer of both; a partial unique index enforces at most one flagged row per registration.
_Avoid_: party member, attendee, user

**Guest member**:
An additional attendee added by the **registrant** during or after registration. Stored in `party_members` alongside the registrant. Has no link to a **user**, and needs none — a guest has no email and no account.
_Avoid_: guest (too vague), party member, attendee

### Photos

**Photo**:
One image in the family gallery, contributed by anyone or imported from the archive. Has a moderation
status — `pending` → `approved` or `rejected` — and **only an approved photo is served to the public**,
enforced both in the gallery query and again per request in the byte proxy. Not linked to a **party
member**, a **registrant** or a **user**: upload carries no credential, so the app cannot honestly
claim to know who sent one. Optionally linked to a **reunion event**; the 290 archive photos are
linked to none, which is why the column is nullable. See [ADR 0009](docs/adr/0009-photos-return-with-a-moderated-gallery.md).
_Avoid_: image, picture, upload, gallery item

**Rendition**:
A derived, EXIF-stripped, web-sized copy of a **photo** — `display` at 1600px and `thumb` at 400px, both
JPEG. The renditions are the ONLY thing retained; the uploaded bytes are decoded, re-encoded and
discarded. Their bucket keys on the photo row are the only pointers to the objects in storage.
_Avoid_: thumbnail (that is one of the two), original, variant

**Moderation queue**:
The **photos** awaiting a decision, shown to organisers as the `?view=photos` lens on the registrations
page. Deliberately not scoped to the reunion event in the URL: archive photos have no event, and a
queue filtered by year would hide the rows most needing a decision.
_Avoid_: pending photos, review queue, inbox

**Contributor**:
Whoever uploaded a **photo**. Anonymous by construction — `contributorName` is an optional, untrusted
free-text courtesy field, not an identity. Not a **user**, not a **registrant**.
_Avoid_: uploader, submitter, photographer

### Two person models — why they're separate

The app has two distinct ways of representing a person. This is intentional:

| Model                             | Table           | Identified by                  | Purpose                                                                 |
| --------------------------------- | --------------- | ------------------------------ | ----------------------------------------------------------------------- |
| **User**                          | `user`          | email + password (Better Auth) | Organisers signing in to administer the app                             |
| **Registrant** + **Guest member** | `party_members` | parent `registrations` row     | Attendance at a specific event — the registrant and any guests they add |

There is no link between them, and none is wanted: an organiser who signs in gains no view of their own registration, and registering creates no account.

**Key invariants:**

- A **registration** is reached by **management token**, never by a user session. An attendee needs no account.
- A **party member** stores their birth date as split integers — `birthYear`, `birthMonth`, `birthDay` — to accommodate partial dates (e.g. known year, unknown day). A CHECK constraint enforces prefix consistency: day implies month, month implies year. **Birth date is optional** and plenty of rows have none. Age is always derived via `getAge()` from `$lib/utils/age`.
- A **party member**'s `tierLabel` and `priceCents` are snapshotted at registration time, so renaming or repricing a **pricing tier** never rewrites history or a refund amount.

## Example dialogue

> **Dev**: When someone registers for the reunion, how many "person" records are we creating?
>
> **Domain**: One `registration` plus one `party_members` row per person in the party — the registrant is the first of those. No `user` is created: registration is public and creates no account.

> **Dev**: Can I look up a guest member's email?
>
> **Domain**: No. Only the **contact** has an email, and it lives on the parent `registrations` row. A guest member's data is limited to what the form collected — name, birth date, shirt size, address, and the two questions. If you need to reach a guest, you reach the contact.

> **Dev**: Someone lost their management link. Can I look up their old one?
>
> **Domain**: No — the database only has `sha256(token)`. `/register/recover` generates a _new_ token and emails it, which invalidates the old one. That is why the rotation only commits after the email send is confirmed: rotating on a failed send locks the registrant out permanently.

## Flagged ambiguities

**"member"** is overloaded: the codebase has `partyMembers`, and Better Auth carries its own implicit "member" concept. Always qualify with context: **registrant** or **guest member**. Never use bare "member."

**"registration" as status vs. record**: `registrations.status` is `pending` for a row whose Stripe checkout has not completed, so an abandoned checkout leaves a permanent `pending` row that is not a registration in any meaningful sense. These are deliberately not cleaned up (deleting by contact email would let anyone clobber a stranger's in-flight checkout). When counting registrations, filter on `paid`/`waived`.

**Two price bases on one registration**: `party_members.priceCents` is the Stripe-grossed-up amount on the paths that charge a card, and the tier's net price on the paths that do not (admin paper entry, admin add). A mixed party therefore sums two different bases. Say which basis you mean whenever you say "price."
