import { retrievePaymentFee } from '$lib/server/payments'
import { STRIPE_RADAR_FEE_CENTS } from '$lib/utils/stripeFee'
import { recordPaymentFee, type FeeRecording } from './recordPaymentFee'

/* Reads Stripe's fee for a payment and records it, if Stripe has it yet.

   Called from both places the fee can first be read: the fulfillment of checkout.session.completed,
   where it is usually NOT there yet (Stripe attaches the balance transaction about three seconds
   later), and charge.updated, which is how Stripe says it now is. recordPaymentFee makes the pair
   count it once. 'unavailable' is not an error — the other path will record it.

   Radar's 5¢ is added here: Stripe bills it outside the charge's balance transaction, so the fee read
   there alone left every card payment 5¢ short of Stripe's net. */
export async function settlePaymentFee(
    paymentIntentId: string,
): Promise<FeeRecording | 'unavailable'> {
    const feeCents = await retrievePaymentFee(paymentIntentId)
    if (feeCents === undefined) {
        return 'unavailable'
    }
    return recordPaymentFee(paymentIntentId, feeCents + STRIPE_RADAR_FEE_CENTS)
}
