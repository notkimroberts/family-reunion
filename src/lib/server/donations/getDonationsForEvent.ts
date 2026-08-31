import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donationStatusEnum, donations } from '$lib/server/db/schema'

export type DonationSummary = {
    id: string
    donorName: string
    donorEmail: string
    message: string | null
    amountCents: number
    /* What Stripe took. Null means not known — and for a gift given during registration it means
       the fee sits on the registration, because the two shared one charge. */
    stripeFeeCents: number | null
    status: (typeof donationStatusEnum.enumValues)[number]
    /* Set when the gift arrived with a booking, so the list can link back to it. */
    registrationId: string | null
    paidAt: Date | null
    createdAt: Date
}

/* Every gift recorded against one reunion, newest first.

   Includes pending and refunded rows, like the registrations list does: a pending gift is an
   abandoned checkout, and an organiser reconciling against Stripe needs to see that it exists
   rather than wonder where it went. */
export async function getDonationsForEvent(eventId: string): Promise<DonationSummary[]> {
    return db
        .select({
            id: donations.id,
            donorName: donations.donorName,
            donorEmail: donations.donorEmail,
            message: donations.message,
            amountCents: donations.amountCents,
            stripeFeeCents: donations.stripeFeeCents,
            status: donations.status,
            registrationId: donations.registrationId,
            paidAt: donations.paidAt,
            createdAt: donations.createdAt,
        })
        .from(donations)
        .where(eq(donations.eventId, eventId))
        .orderBy(desc(donations.createdAt))
}
