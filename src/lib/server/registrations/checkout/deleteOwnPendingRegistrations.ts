import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'

export async function deleteOwnPendingRegistrations(
    userId: string,
    eventId: string,
): Promise<void> {
    const pendingIds = db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                eq(registrations.status, 'pending'),
            ),
        )

    await db.delete(partyMembers).where(inArray(partyMembers.registrationId, pendingIds))
    await db
        .delete(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                eq(registrations.status, 'pending'),
            ),
        )
}
