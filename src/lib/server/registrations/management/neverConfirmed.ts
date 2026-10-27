import type { registrations } from '$lib/server/db/schema'

type ConfirmationColumns = Pick<
    typeof registrations.$inferSelect,
    'status' | 'stripeSessionId' | 'stripePaymentIntentId'
>

/* Whether the registrant has never been sent a confirmation: a public checkout that was started and
   abandoned at Stripe. Nothing emails a pending public booking — the confirmation goes out when the
   webhook marks it paid — so when an organizer later settles or edits one, their email is the
   registrant's FIRST and must read as a confirmation, not "Registration updated" about an original
   they never saw (the e2e run, 2026-10-27).

   A paper entry is not this: admin paper entry emails at creation, whatever its status, and it has no
   Stripe session. A booking paid by card has a payment intent. */
export function neverConfirmed(registration: ConfirmationColumns): boolean {
    return (
        registration.status === 'pending' &&
        registration.stripeSessionId !== null &&
        registration.stripePaymentIntentId === null
    )
}
