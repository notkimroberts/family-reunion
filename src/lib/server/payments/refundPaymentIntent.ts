import { getStripe } from '$lib/server/stripe'

/* Issues a full or partial refund against a Stripe PaymentIntent.
   The `idempotencyKey` is forwarded as Stripe's Idempotency-Key header — pass a stable
   per-action identifier (e.g. the row id being refunded) so that retries do not double-refund. */
export async function refundPaymentIntent(
    paymentIntentId: string,
    amountCents?: number,
    idempotencyKey?: string,
): Promise<void> {
    await getStripe().refunds.create(
        {
            payment_intent: paymentIntentId,
            ...(amountCents !== undefined ? { amount: amountCents } : {}),
        },
        idempotencyKey ? { idempotencyKey } : undefined,
    )
}
