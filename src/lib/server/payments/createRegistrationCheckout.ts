import { dbg } from '$lib/server/debug'
import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem } from './_buildStripeLineItem'
import { checkoutBrandingValue } from './_checkoutBrandingValue'
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
        submit_type: 'book',
        custom_text: { submit: { message: checkoutBrandingValue.registration.submitMessage } },
        /* Names the payment where a person looks for it: the card statement, the Stripe dashboard
           and any Stripe receipt. The ids let a dashboard search find the booking. Never the
           management token — that stays on the session, where only the webhook reads it. */
        payment_intent_data: {
            description: params.description,
            statement_descriptor_suffix:
                checkoutBrandingValue.registration.statementDescriptorSuffix,
            metadata: {
                registrationId: params.registrationId,
                ...(params.donationId ? { donationId: params.donationId } : {}),
            },
        },
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
