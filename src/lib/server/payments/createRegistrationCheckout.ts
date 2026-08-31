import { dbg } from '$lib/server/debug'
import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem } from './_buildStripeLineItem'
import { encodeRegistrationMetadata } from './stripeMetadata'
import type { RegistrationCheckoutParams, RegistrationCheckoutResult } from './types'

/* Creates a Stripe Checkout session for a full event registration with multiple line items. */
export async function createRegistrationCheckout(
    params: RegistrationCheckoutParams,
): Promise<RegistrationCheckoutResult> {
    const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: params.lineItems.map(buildStripeLineItem),
        mode: 'payment',
        customer_email: params.customerEmail,
        success_url: params.successUrl(),
        cancel_url: params.cancelUrl(),
        metadata: encodeRegistrationMetadata(
            params.registrationId,
            params.managementToken,
            params.donationId,
        ),
    })
    dbg.stripe('created checkout session=%s for registration=%s', session.id, params.registrationId)
    return { url: session.url!, sessionId: session.id }
}
