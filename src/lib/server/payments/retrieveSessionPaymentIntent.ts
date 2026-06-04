import { getStripe } from '$lib/server/stripe'

// Retrieves the PaymentIntent ID from a completed Stripe Checkout session; returns null if not a string ID
export async function retrieveSessionPaymentIntent(sessionId: string): Promise<string | null> {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    return typeof session.payment_intent === 'string' ? session.payment_intent : null
}
