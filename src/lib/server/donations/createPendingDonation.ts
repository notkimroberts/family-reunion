import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createDonationCheckout } from '$lib/server/payments'

/* Records a pending gift and opens a Stripe Checkout session for it.

   DELIBERATELY DOES NOT CHECK THE REGISTRATION LOCK DATE, unlike createPendingRegistration. The
   lock exists so catering and shirt counts can be finalised; a gift needs no chair, so /donate
   keeps working after registration closes — which is also when someone who cannot come is most
   likely to want to give.

   eventId is optional for the same reason: a gift can arrive while no reunion is open. It is
   recorded against nothing rather than refused. */
export async function createPendingDonation(params: {
    donorName: string
    donorEmail: string
    amountCents: number
    message?: string
    eventId?: string
    /* What the line item is called on the Stripe page. */
    lineItemName: string
    successUrl: () => string
    cancelUrl: () => string
}): Promise<{ donationId: string; checkoutUrl: string }> {
    const [donation] = await db
        .insert(donations)
        .values({
            eventId: params.eventId ?? null,
            donorName: params.donorName,
            donorEmail: params.donorEmail,
            message: params.message || null,
            amountCents: params.amountCents,
            status: 'pending',
        })
        .returning({ id: donations.id })

    dbg.register('donation created id=%s amount=%d', donation.id, params.amountCents)

    const { url: checkoutUrl, sessionId } = await createDonationCheckout({
        donationId: donation.id,
        name: params.lineItemName,
        amountCents: params.amountCents,
        customerEmail: params.donorEmail,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })

    await db
        .update(donations)
        .set({ stripeSessionId: sessionId, updatedAt: new Date() })
        .where(eq(donations.id, donation.id))

    return { donationId: donation.id, checkoutUrl }
}
