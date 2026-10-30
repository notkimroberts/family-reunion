import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations, registrations } from '$lib/server/db/schema'

/* Deletes a booking that never paid, with its people (ON DELETE CASCADE) and the gift that rode on
   the same checkout. Only when the row is still pending AND still on this session: a booking an
   organizer has marked paid since, or one that moved to a new session, is left alone.

   The gift is matched on the session, not the registration: donations.registration_id is
   ON DELETE SET NULL, so once the booking goes the gift could no longer be found by it.

   Call only for a session Stripe can no longer complete — expired, or refused when expiring it.
   Deleting the row of a payable session would leave a later payment with no booking to fulfill. */
export async function deletePendingRegistration(
    registrationId: string,
    sessionId: string,
): Promise<boolean> {
    return db.transaction(async (tx) => {
        const deleted = await tx
            .delete(registrations)
            .where(
                and(
                    eq(registrations.id, registrationId),
                    eq(registrations.status, 'pending'),
                    eq(registrations.stripeSessionId, sessionId),
                ),
            )
            .returning({ id: registrations.id })
        if (deleted.length === 0) {
            return false
        }
        await tx
            .delete(donations)
            .where(and(eq(donations.stripeSessionId, sessionId), eq(donations.status, 'pending')))
        return true
    })
}
