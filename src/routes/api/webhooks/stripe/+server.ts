import type Stripe from 'stripe'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import { settlePaymentFee } from '$lib/server/fees'
import { fulfillCheckout } from '$lib/server/registrations'
import { getStripe } from '$lib/server/stripe'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, url }) => {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
        dbg.stripe('webhook rejected: missing signature')
        return new Response('Missing signature', { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET!)
    } catch {
        dbg.stripe('webhook rejected: invalid signature')
        return new Response('Invalid signature', { status: 400 })
    }

    dbg.stripe('webhook event type=%s', event.type)

    if (event.type === 'checkout.session.completed') {
        await fulfillCheckout(event.data.object as Stripe.Checkout.Session, url.origin)
    }

    /* Stripe attaches the balance transaction — the fee — to a charge about three seconds AFTER
       checkout.session.completed, and says so with charge.updated. Without this the fee was never
       read: the e2e run found stripe_fee_cents null on every card payment. Other charge.updated
       events (a refund, a dispute) carry the same balance transaction and record nothing new.
       Needs charge.updated enabled on the Stripe webhook endpoint, in test and live mode. */
    if (event.type === 'charge.updated') {
        const charge = event.data.object as Stripe.Charge
        if (charge.balance_transaction && typeof charge.payment_intent === 'string') {
            await settlePaymentFee(charge.payment_intent)
        }
    }

    return new Response('OK', { status: 200 })
}
