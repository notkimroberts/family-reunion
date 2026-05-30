import { getStripe } from '$lib/server/stripe'

export async function refundPaymentIntent(
    paymentIntentId: string,
    amountCents?: number,
): Promise<void> {
    await getStripe().refunds.create({
        payment_intent: paymentIntentId,
        ...(amountCents !== undefined ? { amount: amountCents } : {}),
    })
}
