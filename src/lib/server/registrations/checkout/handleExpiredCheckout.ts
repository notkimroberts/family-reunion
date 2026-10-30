import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { decodeSessionMetadata } from '$lib/server/payments'
import { deletePendingRegistration } from './_deletePendingRegistration'

/* Webhook handler for checkout.session.expired: a registration checkout nobody paid, now beyond
   paying. Deletes its booking when the same email already has a paid or waived one for that reunion
   — they registered on another try, and this row is only clutter. Keeps it otherwise: a family that
   stopped at Stripe is someone an organizer should ring, and may yet pay by check against this row.

   Matching on email is safe here though it is not for replacing a checkout: this only ever deletes
   a row nobody can pay any more, and only beside a booking that did pay.

   Every other session type is ignored, and so is a booking already gone — expiring the previous
   checkout in retirePendingCheckout sends this event too. */
export async function handleExpiredCheckout(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = decodeSessionMetadata(session.metadata)
    if (metadata?.type !== 'registration') {
        return
    }

    const [expired] = await db
        .select({
            id: registrations.id,
            eventId: registrations.eventId,
            contactEmail: registrations.contactEmail,
        })
        .from(registrations)
        .where(
            and(
                eq(registrations.id, metadata.registrationId),
                eq(registrations.status, 'pending'),
                eq(registrations.stripeSessionId, session.id),
            ),
        )
    if (!expired) {
        return
    }

    const [paid] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                ne(registrations.id, expired.id),
                eq(registrations.eventId, expired.eventId),
                sql`lower(${registrations.contactEmail}) = lower(${expired.contactEmail})`,
                inArray(registrations.status, ['paid', 'waived']),
            ),
        )
        .limit(1)
    if (!paid) {
        dbg.stripe('checkout %s expired unpaid; keeping registration %s', session.id, expired.id)
        return
    }

    await deletePendingRegistration(expired.id, session.id)
    dbg.stripe('checkout %s expired; deleted duplicate of registration %s', session.id, paid.id)
}
