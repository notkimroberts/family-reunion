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

   One statement so concurrent Stripe redeliveries serialise: exactly one matches, so exactly one
   receipt is sent. An unconditional update would thank the donor again on every redelivery. Same
   shape as the registration transition in fulfillCheckout, and for the same reason.

   feeCents is left alone when undefined. That is the gift-added-to-a-registration case: both line
   items were paid in one charge with one balance transaction, and the fee is recorded on the
   registration — writing it here as well would count it twice. */
export async function markDonationPaid(params: {
    donationId: string
    stripePaymentIntentId?: string | null
    feeCents?: number
}): Promise<PaidDonation | undefined> {
    const [updated] = await db
        .update(donations)
        .set({
            status: 'paid',
            paidAt: new Date(),
            stripePaymentIntentId: params.stripePaymentIntentId ?? null,
            ...(params.feeCents === undefined ? {} : { stripeFeeCents: params.feeCents }),
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
