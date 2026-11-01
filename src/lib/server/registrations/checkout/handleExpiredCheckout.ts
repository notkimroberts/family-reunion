import { and, eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { decodeSessionMetadata } from '$lib/server/payments'
import { deletePendingRegistration } from './_deletePendingRegistration'

/* Webhook handler for checkout.session.expired: a registration checkout nobody paid, now beyond
   paying. Deletes its booking, people and pending gift. A family that gave up at Stripe registers
   again or is entered on paper; the row only inflated Outstanding and the pending counts.

   deletePendingRegistration matches status 'pending' AND this session, so a booking an organizer
   marked paid or waived since, or one moved to a new session, is kept. Paper entries carry no
   session and never reach here.

   Every other session type is ignored, and so is a booking already gone — expiring the previous
   checkout in retirePendingCheckout sends this event too. */
export async function handleExpiredCheckout(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = decodeSessionMetadata(session.metadata)
    if (metadata?.type !== 'registration') {
        return
    }

    const deleted = await deletePendingRegistration(metadata.registrationId, session.id)
    if (deleted) {
        dbg.stripe(
            'checkout %s expired; deleted registration %s',
            session.id,
            metadata.registrationId,
        )
    }
}
