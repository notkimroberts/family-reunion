import type Stripe from 'stripe'
import { env } from '$env/dynamic/private'
import { dbg } from '$lib/server/debug'
import { fulfillCheckout } from '$lib/server/registrations'
import { getStripe } from '$lib/server/stripe'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
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
        await fulfillCheckout(event.data.object as Stripe.Checkout.Session)
    }

    return new Response('OK', { status: 200 })
}
