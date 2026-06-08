import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, reunionEvents } from '$lib/server/db/schema'

export type RegistrationByEmail = {
    id: string
    eventTitle: string
}

/* Returns active registrations (paid, waived, or pending) matching the contact email, joined with the event title. Used by the recovery flow to email the management link. */
export async function getRegistrationsByEmail(
    contactEmail: string,
): Promise<RegistrationByEmail[]> {
    return db
        .select({ id: registrations.id, eventTitle: reunionEvents.title })
        .from(registrations)
        .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
        .where(
            and(
                eq(registrations.contactEmail, contactEmail),
                inArray(registrations.status, ['paid', 'waived', 'pending']),
            ),
        )
}
