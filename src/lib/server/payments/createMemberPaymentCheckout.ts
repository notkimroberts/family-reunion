import { createHash } from 'node:crypto'
import { dbg } from '$lib/server/debug'
import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem } from './_buildStripeLineItem'
import { checkoutBrandingValue } from './_checkoutBrandingValue'
import { encodeMemberPaymentMetadata } from './stripeMetadata'
import type { MemberPaymentCheckoutParams, RegistrationCheckoutResult } from './types'

const FINGERPRINT_LENGTH = 16

/* Creates a Stripe Checkout session paying for the places still owed on a paid booking: one line
   item per person, at the gross.

   The idempotency key is a hash of the whole request, so pressing Pay twice, or going back from
   Stripe and pressing it again, returns the SAME session instead of opening a second one that could
   also be paid. Anything that changes the request — a person settled by hand, a tier changed, a new
   email address — changes the key and so opens a fresh session, which is also what Stripe requires:
   reusing a key with different parameters is an error. Stripe forgets a key after 24 hours, about
   when the session it returned expires. */
export async function createMemberPaymentCheckout(
    params: MemberPaymentCheckoutParams,
): Promise<RegistrationCheckoutResult> {
    const request = {
        payment_method_types: ['card' as const],
        line_items: params.lines.map((line) =>
            buildStripeLineItem({ name: line.name, priceCents: line.grossCents }),
        ),
        mode: 'payment' as const,
        submit_type: 'pay' as const,
        custom_text: { submit: { message: checkoutBrandingValue.registration.submitMessage } },
        payment_intent_data: {
            description: params.description,
            statement_descriptor_suffix:
                checkoutBrandingValue.registration.statementDescriptorSuffix,
            metadata: { registrationId: params.registrationId },
        },
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: encodeMemberPaymentMetadata({
            registrationId: params.registrationId,
            viewToken: params.viewToken,
            charges: params.lines.map((line) => ({
                memberId: line.memberId,
                grossCents: line.grossCents,
            })),
        }),
    }

    const fingerprint = createHash('sha256')
        .update(JSON.stringify(request))
        .digest('hex')
        .slice(0, FINGERPRINT_LENGTH)

    const session = await getStripe().checkout.sessions.create(request, {
        idempotencyKey: `member-payment-${params.registrationId}-${fingerprint}`,
    })
    dbg.stripe(
        'created member payment session=%s for registration=%s',
        session.id,
        params.registrationId,
    )
    return { url: session.url!, sessionId: session.id }
}
