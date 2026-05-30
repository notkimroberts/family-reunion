import { getStripe } from '$lib/server/stripe'
import { buildStripeLineItem, type LineItemInput } from './_buildStripeLineItem'
import { encodeRegistrationMetadata } from './stripeMetadata'

export async function createRegistrationCheckout(params: {
    lineItems: LineItemInput[]
    registrationId: string
    successUrl: (id: string) => string
    cancelUrl: (id: string) => string
}): Promise<{ url: string; sessionId: string }> {
    console.log(
        '[stripe-debug] creating checkout, httpClient:',
        (getStripe() as any)._httpClient?.constructor?.name ?? 'unknown',
    )
    let session
    try {
        session = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: params.lineItems.map(buildStripeLineItem),
            mode: 'payment',
            success_url: params.successUrl(params.registrationId),
            cancel_url: params.cancelUrl(params.registrationId),
            metadata: encodeRegistrationMetadata(params.registrationId),
        })
    } catch (err: any) {
        console.error(
            '[stripe-debug] checkout error:',
            err?.type,
            err?.message,
            'detail:',
            err?.detail,
            'detail.code:',
            err?.detail?.code,
            'detail.message:',
            err?.detail?.message,
        )
        throw err
    }
    return { url: session.url!, sessionId: session.id }
}
