import { error } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { createMemberPaymentCheckout } from '$lib/server/payments'
import { getAmountDueByToken } from '../queries'
import { getCheckoutEvent } from './_getCheckoutEvent'

const NOTHING_OWED = 'Nothing is owed on this registration.'

/* Opens a Stripe Checkout session paying for everyone still owed on a paid booking, for whoever holds
   its view token.

   The view token is enough here, unlike for the self-service changes that were removed: this moves
   money IN, for an amount an organizer set, and the worst a forwarded link allows is a relative
   paying for someone else's place. It refunds nothing and changes nobody.

   Ignores the opening and lock dates. An organizer added these people and has already counted them;
   the dates guard new bookings, not money owed on an existing one.

   The amount is re-read from the database at the moment of paying, never taken from the page, so a
   place settled by hand a minute ago is not charged again. */
export async function createMemberPayment(params: {
    viewToken: string
    successUrl: string
    cancelUrl: string
}): Promise<{ checkoutUrl: string }> {
    const owed = await getAmountDueByToken(params.viewToken)
    if (!owed) {
        throw error(404, 'Registration not found')
    }

    /* Empty on a booking that is not paid, as well as on one whose places are all settled. */
    const { registration, quote } = owed
    if (quote.lines.length === 0) {
        throw error(409, NOTHING_OWED)
    }

    const checkoutEvent = await getCheckoutEvent(registration.eventId)

    const { url, sessionId } = await createMemberPaymentCheckout({
        registrationId: registration.id,
        viewToken: params.viewToken,
        lines: quote.lines.map((line) => ({
            memberId: line.memberId,
            name: `${line.name} (${line.tierLabel})`,
            grossCents: line.grossCents,
        })),
        description: `${checkoutEvent?.title ?? 'Family reunion'} registration`,
        customerEmail: registration.contactEmail,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })

    dbg.register(
        'member payment session=%s opened for registration %s (%d owed, %d cents)',
        sessionId,
        registration.id,
        quote.lines.length,
        quote.cardTotalCents,
    )

    return { checkoutUrl: url }
}
