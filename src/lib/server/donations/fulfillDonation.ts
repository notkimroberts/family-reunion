import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendDonationReceipt } from '$lib/server/email'
import { retrievePaymentFee } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
import { markDonationPaid } from './markDonationPaid'

/* Fallback title for the receipt when the gift is attached to no reunion — see
   createPendingDonation on why eventId is nullable. */
const UNATTACHED_EVENT_TITLE = 'the family reunion'

/* Webhook fulfilment for a standalone gift: mark it paid, record what Stripe took, thank the donor.

   The fee is read BEFORE the update because it is a network call to Stripe and must not hold a
   transaction open, and because the update has to stay the single conditional statement that makes
   redeliveries idempotent. */
export async function fulfillDonation(
    donationId: string,
    paymentIntentId: string | null,
): Promise<void> {
    const feeCents = paymentIntentId ? await retrievePaymentFee(paymentIntentId) : undefined

    const donation = await markDonationPaid({
        donationId,
        stripePaymentIntentId: paymentIntentId,
        feeCents,
    })

    if (!donation) {
        dbg.stripe('donation %s not pending; already fulfilled or missing, ignoring', donationId)
        return
    }

    let eventTitle = UNATTACHED_EVENT_TITLE
    if (donation.eventId) {
        const [event] = await db
            .select({ title: reunionEvents.title })
            .from(reunionEvents)
            .where(eq(reunionEvents.id, donation.eventId))
            .limit(1)
        eventTitle = event?.title ?? UNATTACHED_EVENT_TITLE
    }

    /* Not rethrown, for the same reason as the confirmation email: the payment is captured and the
       row is correct, and a 500 would make Stripe retry an event whose database work is done. The
       conditional transition means no redelivery will try the send again, so this is the only
       attempt and it has to reach a human. */
    try {
        await sendDonationReceipt(
            donation.donorEmail,
            {
                donorName: donation.donorName,
                eventTitle,
                amountCents: donation.amountCents,
            },
            `donation/${donation.id}`,
        )
    } catch (err) {
        reportError('donation receipt failed', err, { donationId })
    }
}
