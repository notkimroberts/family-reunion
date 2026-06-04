import { getStripe } from '$lib/server/stripe'

// Issues a full or partial refund against a Stripe PaymentIntent
export async function refundPaymentIntent(
    paymentIntentId: string,
    amountCents?: number,
): Promise<void> {
    await getStripe().refunds.create({
        payment_intent: paymentIntentId,
        ...(amountCents !== undefined ? { amount: amountCents } : {}),
    })
}
