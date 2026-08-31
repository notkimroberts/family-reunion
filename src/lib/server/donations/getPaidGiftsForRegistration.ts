import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations } from '$lib/server/db/schema'

export type RegistrationGift = {
    amountCents: number
    /* Which charge the gift rode on. Null for a gift an organiser recorded against a paper entry —
       no card was involved, so nothing about it is refundable through Stripe. */
    stripePaymentIntentId: string | null
}

/* The gifts still standing against one registration.

   Read by the cancellation, which has to know what a full refund would hand back: a gift given
   during registration was a line item on the booking's own charge, and the reunion keeps gifts. */
export async function getPaidGiftsForRegistration(
    registrationId: string,
): Promise<RegistrationGift[]> {
    return db
        .select({
            amountCents: donations.amountCents,
            stripePaymentIntentId: donations.stripePaymentIntentId,
        })
        .from(donations)
        .where(and(eq(donations.registrationId, registrationId), eq(donations.status, 'paid')))
}
