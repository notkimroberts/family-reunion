import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations } from '$lib/server/db/schema'

export type PaidDonation = {
    id: string
    donorName: string
    donorEmail: string
    amountCents: number
    eventId: string | null
}

/* Conditional pending → paid, in one statement, returning the row only when this call is what
   moved it.

   One statement so concurrent Stripe redeliveries serialize: exactly one matches, so exactly one
   receipt is sent. An unconditional update would thank the donor again on every redelivery. Same
   shape as the registration transition in fulfillCheckout, and for the same reason.

   Writes no fee: recordPaymentFee does, once per payment intent — on a standalone gift here, and
   for a gift added to a registration on the registration, since both shared one charge. */
export async function markDonationPaid(params: {
    donationId: string
    stripePaymentIntentId?: string | null
}): Promise<PaidDonation | undefined> {
    const [updated] = await db
        .update(donations)
        .set({
            status: 'paid',
            paidAt: new Date(),
            stripePaymentIntentId: params.stripePaymentIntentId ?? null,
            updatedAt: new Date(),
        })
        .where(and(eq(donations.id, params.donationId), eq(donations.status, 'pending')))
        .returning({
            id: donations.id,
            donorName: donations.donorName,
            donorEmail: donations.donorEmail,
            amountCents: donations.amountCents,
            eventId: donations.eventId,
        })

    return updated
}
