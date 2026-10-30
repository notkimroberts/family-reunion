import { getStripe } from '$lib/server/stripe'

/* Closes a Checkout session so nobody can pay it any more.

   'complete' when the session already took payment: the caller must keep its booking, since the
   webhook is on its way or has arrived. A session that completes between the retrieve and the expire
   makes Stripe refuse the expire, and that throws — the caller keeps the booking then too. */
export async function expireCheckoutSession(sessionId: string): Promise<'expired' | 'complete'> {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.status === 'complete') {
        return 'complete'
    }
    if (session.status === 'open') {
        await stripe.checkout.sessions.expire(sessionId)
    }
    return 'expired'
}
