import { getStripe } from '$lib/server/stripe'

/* The fee Stripe actually took on a payment, in cents.

   WHY THIS EXISTS. The admin money panel estimated the fee at 2.9% + 30¢ per charge, which is Stripe's
   standard domestic-card rate and therefore a FLOOR, not a fact: an international card adds 1.5%, and a
   currency conversion adds more. The estimate could only ever be optimistic about what reaches the bank.
   The real figure is on the charge's balance transaction, and this reads it.

   The expand path is three links, each of which Stripe types as `string | object | null` because it
   returns a bare id unless asked to expand:

     paymentIntent.latest_charge  ->  charge.balance_transaction  ->  balanceTransaction.fee

   RETURNS UNDEFINED RATHER THAN THROWING, at every one of those links and on any API error. The only
   caller is the Stripe webhook, where the fee is incidental: the payment is captured and the
   registration must be marked paid whether or not the fee could be read. Throwing here would fail the
   webhook, and Stripe would retry an event whose real work is already done. Undefined means "not known",
   which the panel renders by falling back to the estimate.

   `fee`, not `amount - net`: they agree for a plain charge, but `net` is what lands in the balance and
   the two diverge for cases like a partially-captured payment. `fee` is the number Stripe's dashboard
   shows as "Fee", which is the one an organiser reconciles against. */
export async function retrievePaymentFee(paymentIntentId: string): Promise<number | undefined> {
    try {
        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge.balance_transaction'],
        })

        const charge = paymentIntent.latest_charge
        /* A string here means the expand did not resolve — no charge yet, or the id came back bare. */
        if (!charge || typeof charge === 'string') {
            return undefined
        }

        const balanceTransaction = charge.balance_transaction
        if (!balanceTransaction || typeof balanceTransaction === 'string') {
            return undefined
        }

        return balanceTransaction.fee
    } catch {
        return undefined
    }
}
