import Stripe from 'stripe'
import { RADAR_FEE_CENTS } from './money'

/* The same test-mode account the server uses, to read back what Stripe actually charged, the fee on
   it, and every refund. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

export type ChargeFacts = {
    paymentIntentId: string
    amountCents: number
    feeCents: number
    refundedCents: number
}

/* What Stripe holds for one PaymentIntent: the amount charged, the fee (its balance transaction's plus
   Radar's, which Stripe bills separately), and the total refunded so far. */
export async function chargeFacts(paymentIntentId: string): Promise<ChargeFacts> {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge.balance_transaction'],
    })
    const charge = intent.latest_charge
    if (!charge || typeof charge === 'string') {
        throw new Error(`No charge on ${paymentIntentId}`)
    }
    const balance = charge.balance_transaction
    return {
        paymentIntentId,
        amountCents: charge.amount,
        feeCents: balance && typeof balance !== 'string' ? balance.fee + RADAR_FEE_CENTS : -1,
        refundedCents: charge.amount_refunded,
    }
}

/* Redelivers a Stripe event to the e2e server exactly as Stripe would — the original event body,
   signed with the listener's webhook secret. Stripe's own retry cannot be triggered on demand, and a
   redelivery is precisely a second POST of the same event. */
export async function redeliverEvent(eventId: string, webhookUrl: string): Promise<number> {
    const event = await stripe.events.retrieve(eventId)
    const payload = JSON.stringify(event)
    const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.E2E_STRIPE_WEBHOOK_SECRET ?? '',
    })
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        body: payload,
    })
    return response.status
}

/* The checkout.session.completed event Stripe sent for a session. */
export async function completedEventFor(sessionId: string): Promise<string> {
    const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 20 })
    const event = events.data.find((item) => (item.data.object as { id: string }).id === sessionId)
    if (!event) {
        throw new Error(`No checkout.session.completed event for ${sessionId}`)
    }
    return event.id
}
