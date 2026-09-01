import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrationStatusEnum, registrations } from '$lib/server/db/schema'

export type UnlistedAttendee = {
    id: string
    name: string
    registrationId: string
    contactName: string
    status: (typeof registrationStatusEnum.enumValues)[number]
    updatedAt: Date
}

/* The people a greeter searches for and does NOT find on the check-in list.

   getEventPeople is paid-and-waived only, and rightly so: it is the number catering ordered against.
   But a name that is simply absent reads as a broken list, and the greeter starts doubting every
   other row. So a search that misses looks here as well and can say WHY — the checkout was never
   completed, or the booking was cancelled and refunded.

   Read-only. Nothing here can be ticked: an unpaid party goes through the booking page, where the
   money is visible, and a walk-up goes through paper entry. */
export async function searchEventAttendees(
    eventId: string,
    search: string,
): Promise<UnlistedAttendee[]> {
    const term = search.trim()
    if (!term) {
        return []
    }

    const pattern = `%${term}%`

    return (
        db
            .select({
                id: partyMembers.id,
                name: partyMembers.name,
                registrationId: registrations.id,
                contactName: registrations.contactName,
                status: registrations.status,
                updatedAt: registrations.updatedAt,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            /* and(), not JS && — the operators are drizzle values, so && silently discards the left side
           and would serve every year at once. */
            .where(
                and(
                    eq(registrations.eventId, eventId),
                    /* The two statuses that are not on the check-in list. A cancelled booking IS
                   'refunded' — there is no separate cancelled status. */
                    inArray(registrations.status, ['pending', 'refunded']),
                    /* The person AND whoever booked them, matching the check-in list's own search: an
                   organiser is as likely to be handed "the Pattersons" as a first name. */
                    or(
                        ilike(partyMembers.name, pattern),
                        ilike(registrations.contactName, pattern),
                    ),
                ),
            )
            .orderBy(asc(registrations.contactName), asc(partyMembers.name))
    )
}
