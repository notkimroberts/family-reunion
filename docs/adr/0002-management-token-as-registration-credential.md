# ADR 0002 — The management token is the registration credential

**Status:** Accepted  
**Date:** 2026-08-23  
**Supersedes:** [ADR 0001](./0001-magic-link-only-auth.md)

## Context

Registration originally required an account: a registrant signed in by magic link, and the
registration hung off `registrations.userId`. For a family reunion this inverted the
difficulty — the people most likely to struggle with a magic-link round trip are exactly the
older relatives most likely to attend. Sign-in was pure friction in front of the one thing the
site exists to do, and every abandoned sign-in was a lost registration.

We needed a way for someone to return later and add a cousin, fix a shirt size, or cancel,
without holding an account.

## Decision

Registration is fully public. Each registration is owned by a **management token** — 32 random
bytes, base64url — and that token is the only credential. `/register/manage` performs no
per-request auth check: possession of the token _is_ the authorisation.

The database stores only `sha256(token)`. The plaintext exists in exactly two places: the URL
sent to the registrant, and Stripe session metadata, so the webhook can build the manage link
for the confirmation email.

Users still exist, but only for organisers, who sign in with email and password to reach
`/admin`.

## Rationale

- Removes every step between "I want to come" and "I have paid". No account, no inbox
  round trip, no password.
- A capability URL is a familiar pattern for exactly this shape of problem (parcel tracking,
  calendar invites, unsubscribe links) and needs no new infrastructure.
- Storing only the hash means a database leak does not hand over the ability to modify or
  cancel other people's registrations.
- Admins can create a registration on someone's behalf and hand over the resulting link, which
  covers attendees with no usable email at all.

## Trade-offs

- **Anyone with the link has full control**, including cancelling and triggering a refund. There
  is no second factor. Accepted: the blast radius is one registration in a private family
  event, and the alternative cost is measured in people who never register at all.
- **The token cannot be recovered, only rotated.** Because only the hash is stored,
  `/register/recover` has to mint a new token and invalidate the old one. This makes the
  rotation ordering load-bearing: it must commit only after the email send is confirmed.
  Rotating on a failed send locks the registrant out permanently. This exact bug shipped —
  the Resend SDK resolves with `{ data, error }` instead of throwing, so the guard never
  fired — and is now pinned by a regression test in
  `src/routes/(app)/register/recover/server.test.ts`.
- **Tokens live in email indefinitely.** No expiry, because an expired link would strand
  someone mid-event. Accepted.
- **No "my registrations" view for a signed-in organiser.** Their own registration is reached
  by token like everyone else's.

## Consequences

- `registrations.userId` is gone; `managementToken` (the hash) is `notNull().unique()`.
- `/register/manage?token=…` sets an HttpOnly `reg_token` cookie on first land and redirects to
  a clean URL, keeping the plaintext out of later access logs, Sentry breadcrumbs and referers.
- Every management action (`add_member`, `update_member`, `remove_member`, `cancel`) takes the
  token as a form field and re-resolves the registration from it server-side.
- `/register/recover` returns a generic success regardless of whether the email matched, to
  avoid confirming which addresses are registered.
- Refund flows pass stable Stripe idempotency keys, since the token holder can retry a
  cancel freely.
- Reversing this decision is expensive: no migration can recover plaintext tokens, so
  reintroducing accounts would require re-issuing every outstanding link.
