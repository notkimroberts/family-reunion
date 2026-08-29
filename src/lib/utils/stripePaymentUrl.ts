/* A deep link to one payment in the Stripe dashboard.

   Keyed on the PaymentIntent, which is the id the dashboard's Payments detail page uses. Checkout Session
   ids are stored too, but there is no equally dependable dashboard route for them.

   The MODE matters and cannot be inferred from the id: test and live intents look alike, and a test id
   under the live path shows "no such payment". So the caller passes it, from whether STRIPE_SECRET_KEY is
   a test key — the one place that actually knows.

   Returns undefined rather than a broken link when there is no intent, which is every registration paid
   by cheque, every abandoned checkout, and everything paid before the id was stored at registration
   level. A link that goes nowhere is worse than no link. */
export function stripePaymentUrl(
    paymentIntentId: string | null | undefined,
    isTestMode: boolean,
): string | undefined {
    if (!paymentIntentId) {
        return undefined
    }
    return `https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}payments/${paymentIntentId}`
}
