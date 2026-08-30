# ADR 0008 — Contact details stay on the registration

**Status:** Accepted
**Date:** 2026-08-30

## Context

`registrations` carries `contact_name`, `contact_email` and `contact_phone`. The contact is also an
attendee — the public form makes them pick their own tier — so there is a `party_members` row for the
same person, flagged `is_contact`. That makes `contact_name` and that row's `name` two copies of one
string, which looks like a normalisation failure and invites the obvious fix: move all three onto
`party_members`, and perhaps rename the table to `registrants` while there.

This ADR records why not, because the question will be asked again.

## Decision

**All three columns stay on `registrations`.** `party_members` is not renamed.

## Rationale

**`contact_email` is booking data, not attendee data.** It is the address the payment receipt goes to,
the address the confirmation goes to, and the key the management link is recovered by. Only one person
per registration has one; a guest member has no email at all, by design (see CONTEXT.md).

**It is the credential-recovery key, and it must outlive any attendee row.** The database stores only
`sha256(managementToken)`, so a lost link cannot be looked up — `/register/recover` matches
`registrations.contact_email` (`getRegistrationsByEmail`, backed by `registrations_contact_email_idx`)
and issues a fresh token. That is the only route back into a registration.

**`party_members` rows are deletable by the registrant.** `removeMember` — the token-gated path the
public manage page uses — has no `is_contact` guard, and the page offers Remove on every row whenever
more than one member remains. Only the admin path refuses (`removeAdminMember`). Put the email on that
row and the payer can delete their own way back in, in the middle of a partial refund.

**A registration outlives its party.** `removeMember` marks a registration `refunded` when the last
member goes, and `_performCancellation` emails `registration.contactEmail` _after_ writing that status.
A contact stored on a child row has nowhere to live once the party is empty, and the cancellation
email — the one that tells someone their money is coming back — would have no recipient.

**The invariant is not enforceable in the direction that matters.** A partial unique index on
`(registration_id) WHERE is_contact` gives "at most one contact". Nothing gives "at least one". Moving
`NOT NULL` columns off the parent onto nullable columns on N child rows trades an invariant Postgres
enforces for one the application has to remember — and the application has already forgotten it once:
`seed.ts` never set `is_contact`, so every locally seeded registration had no contact row at all.

**The one real duplicate is already solved.** `contact_name` and the flagged row's `name` are kept in
step by a single writer, `updateRegistrationContact`, and the admin form renders the attendee copy
read-only for the same reason. Deriving the column away would add a join to every read that shows who
booked — including `orderBy(asc(registrations.contactName))` in `getEventPeople` — and would re-open
"what if there is no flagged row", to delete one text column.

**`registrants` is the wrong name.** CONTEXT.md already uses "registrant" for the contact
specifically, as opposed to a "guest member". A table called `registrants` would make `is_contact`
read as "the registrant among the registrants". If the table is ever renamed, `attendees` is the
accurate word — it is what every row is, contact or not.

## Consequences

- The contact's name exists in two places on purpose. `updateRegistrationContact` is the only writer of
  both; anything else that wants to change it goes through there.
- `seed.ts` now sets `isContact: index === 0`, matching what `createAdminRegistration` and
  `createPendingRegistration` do. Before this, no locally seeded registration had a contact row, so
  every code path keyed on the flag silently did nothing in dev while working in production.
- **`removeMember` still lets a registrant delete their own attendee row** while keeping the booking.
  The registration keeps its contact details, so nothing breaks — but it leaves a party whose contact
  is not in it. That is a product question (should the public Remove refuse on the contact's own row,
  as the admin one does?), not a schema one, and it is deliberately left open.
- If contact details ever need to belong to a person rather than a booking — several bookings by one
  organiser, say — the answer is a `contacts` table the registration points at, not columns on
  `party_members`.
