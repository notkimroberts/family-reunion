export type MemberPaymentOrigin =
    | 'paid_online'
    | 'added_online'
    | 'recorded_offline'
    | 'unpaid'
    | 'comped'

/* How one party member's place was paid for.

   Needs both the member's own columns and the registration's, because a member row alone cannot tell
   the difference between "recorded offline by an organiser" and "part of an online order that was
   never completed" — in both cases every Stripe column is null. Reading the member alone is exactly
   the bug this replaces.

   The registration STATUS is read first. A comped party has a price snapshotted against every member
   and no payment columns anywhere, which is indistinguishable from a cheque payer by Stripe data alone
   — so a waived registration rendered "Recorded offline" beside a "Waived" badge, saying two different
   things about the same money. Nothing was recorded as paid; it was written off.

   After that, order matters. stripeCheckoutSessionId is set only by the add-member checkout, so it is
   the most specific signal and is checked first; stripePaymentIntentId is backfilled onto every member
   of a registration when its payment settles, so it comes second. */
export function getMemberPaymentOrigin(
    member: { stripePaymentIntentId: string | null; stripeCheckoutSessionId: string | null },
    registration: { stripeSessionId: string | null; status: string },
): MemberPaymentOrigin {
    if (registration.status === 'waived') {
        return 'comped'
    }

    if (member.stripeCheckoutSessionId) {
        return 'added_online'
    }

    if (member.stripePaymentIntentId) {
        return 'paid_online'
    }

    /* No payment columns at all. If the registration never opened a Stripe session, an organiser
       entered this person by hand. If it did, this row belongs to an order that never settled — which
       is unpaid, not offline. */
    return registration.stripeSessionId ? 'unpaid' : 'recorded_offline'
}
