import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { expireCheckoutSession } from '$lib/server/payments'
import { reportError } from '$lib/server/reportError'
import { hashViewToken } from '../hashViewToken'
import { deletePendingRegistration } from './_deletePendingRegistration'

/* Removes the booking this browser opened on its last Pay, once it opens a new one, so pressing Pay,
   Back and Pay again leaves one pending row rather than one per press — and one payable session,
   so two tabs cannot both be paid.

   Found by the view token in this browser's own cookie (PENDING_CHECKOUT_COOKIE), never by email:
   matching on email would let anyone type a stranger's address and cancel their checkout.

   Kept when its session already took payment, and on any failure. Leaving clutter is the safe way
   to fail; deleting a booking whose session may still be paid is not. */
export async function retirePendingCheckout(viewToken: string, eventId: string): Promise<void> {
    const [previous] = await db
        .select({ id: registrations.id, stripeSessionId: registrations.stripeSessionId })
        .from(registrations)
        .where(
            and(
                eq(registrations.viewToken, hashViewToken(viewToken)),
                eq(registrations.eventId, eventId),
                eq(registrations.status, 'pending'),
                isNotNull(registrations.stripeSessionId),
            ),
        )
    if (!previous?.stripeSessionId) {
        return
    }

    try {
        if ((await expireCheckoutSession(previous.stripeSessionId)) === 'complete') {
            dbg.register('previous checkout %s was paid; keeping it', previous.stripeSessionId)
            return
        }
        await deletePendingRegistration(previous.id, previous.stripeSessionId)
        dbg.register('replaced pending registration %s', previous.id)
    } catch (error) {
        /* The old session may still be payable alongside the new one. */
        reportError('could not retire the previous pending checkout', error, {
            registrationId: previous.id,
            sessionId: previous.stripeSessionId,
        })
    }
}
