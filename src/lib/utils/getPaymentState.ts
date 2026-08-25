import type { registrationStatusEnum } from '$lib/server/db/schema'

type RegistrationStatus = (typeof registrationStatusEnum.enumValues)[number]

export type PaymentState =
    | 'paid_online'
    | 'paid_offline'
    | 'checkout_incomplete'
    | 'awaiting_payment'
    | 'waived'
    | 'cancelled'

/* How a registration's money actually stands.

   Replaces reading partyMembers.stripePaymentIntentId, which was wrong. That column is null for a
   family paying by cheque AND for anyone who opened Stripe Checkout and never finished, so the admin
   page labelled an abandoned online registration "Offline" — indistinguishable from money owed by
   post, and the opposite follow-up. removeMember already treats the column as unreliable: it falls
   back to retrieving the intent from the registration's session when the member's own is null.

   The reliable signals are at registration level. status says whether money arrived; the presence of
   a Stripe session says which route it came by.

   'checkout_incomplete' is the case that had no name before: a public registration that reached
   Stripe and stopped. Nothing is owed by post — the family most likely thinks they failed to register
   — so it needs chasing differently from a cheque. */
export function getPaymentState(registration: {
    status: RegistrationStatus
    stripeSessionId: string | null
}): PaymentState {
    if (registration.status === 'refunded') {
        return 'cancelled'
    }

    if (registration.status === 'waived') {
        return 'waived'
    }

    if (registration.status === 'paid') {
        return registration.stripeSessionId ? 'paid_online' : 'paid_offline'
    }

    return registration.stripeSessionId ? 'checkout_incomplete' : 'awaiting_payment'
}
