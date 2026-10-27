import type { MemberSettlement } from '$lib/general/constants'

export type MemberPaymentOrigin =
    'paid_online' | 'added_online' | 'recorded_offline' | 'unpaid' | 'comped' | 'payment_due'

/* How one party member's place was paid for.

   Needs both the member's own columns and the registration's, because a member row alone cannot tell
   the difference between "recorded offline by an organizer" and "part of an online order that was
   never completed" — in both cases every Stripe column is null. Reading the member alone is exactly
   the bug this replaces.

   The registration STATUS is read first. A comped party has a price snapshotted against every member
   and no payment columns anywhere, which is indistinguishable from a check payer by Stripe data alone
   — so a waived registration rendered "Recorded offline" beside a "Waived" badge, saying two different
   things about the same money. Nothing was recorded as paid; it was written off.

   paymentDue comes next, and only on a paid booking: an organizer added this person after the money
   arrived, and nobody has paid for them. On a booking that has paid by card that person has no Stripe
   columns and read "Not paid" before the flag existed, which was true but gave no next step.

   A place an organizer settled by hand says so next: 'paid' is money that came by Zelle or check,
   'covered' is a place given away. Without it a settled place still read "Not paid", because it has
   no payment intent on a booking with a Stripe session — exactly the shape of an abandoned checkout.

   After that, order matters. stripeCheckoutSessionId is set only by the add-member checkout, so it is
   the most specific signal and is checked first; stripePaymentIntentId is backfilled onto every member
   of a registration when its payment settles, so it comes second. */
export function getMemberPaymentOrigin(
    member: {
        stripePaymentIntentId: string | null
        stripeCheckoutSessionId: string | null
        paymentDue: boolean
        settlement: MemberSettlement | null
    },
    registration: { stripeSessionId: string | null; status: string },
): MemberPaymentOrigin {
    if (registration.status === 'waived') {
        return 'comped'
    }

    if (member.paymentDue) {
        return 'payment_due'
    }

    if (member.settlement === 'covered') {
        return 'comped'
    }

    if (member.settlement === 'paid') {
        return 'recorded_offline'
    }

    if (member.stripeCheckoutSessionId) {
        return 'added_online'
    }

    if (member.stripePaymentIntentId) {
        return 'paid_online'
    }

    /* No payment columns at all. If the registration never opened a Stripe session, an organizer
       entered this person by hand. If it did, this row belongs to an order that never settled — which
       is unpaid, not offline. */
    return registration.stripeSessionId ? 'unpaid' : 'recorded_offline'
}
