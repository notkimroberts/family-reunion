import { dbg } from '$lib/server/debug'
import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem } from './_buildStripeLineItem'
import { encodeDonationMetadata } from './stripeMetadata'
import type { DonationCheckoutParams, RegistrationCheckoutResult } from './types'

/* Creates a Stripe Checkout session for a standalone gift: one line item, charged at exactly the
   amount the donor chose. No gross-up — see the donations table comment. */
export async function createDonationCheckout(
    params: DonationCheckoutParams,
): Promise<RegistrationCheckoutResult> {
    const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [buildStripeLineItem({ name: params.name, priceCents: params.amountCents })],
        mode: 'payment',
        customer_email: params.customerEmail,
        success_url: params.successUrl(),
        cancel_url: params.cancelUrl(),
        metadata: encodeDonationMetadata(params.donationId),
    })
    dbg.stripe('created donation session=%s for donation=%s', session.id, params.donationId)
    return { url: session.url!, sessionId: session.id }
}
