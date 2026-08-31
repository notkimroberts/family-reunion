import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrationStatusEnum, registrations } from '$lib/server/db/schema'

export type EventPerson = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    tierLabel: string
    priceCents: number
    shirtSize: string | null
    vegetarianMeal: boolean | null
    attendedReunion2025: boolean | null
    isContact: boolean
    registrationId: string
    contactName: string
    contactEmail: string
    status: (typeof registrationStatusEnum.enumValues)[number]
}

/* One row per PERSON rather than per booking — the same event, seen through a different lens.

   This is the list you work from on the day and the one catering and shirt orders come off: a party of
   six is six chairs, six meals and six shirts, and the bookings view collapses it to a single row.

   'paid' and 'waived' only. A pending registration is not an attendee yet and a refunded one is not one
   any more, so including either would inflate every count an organiser reads off this. The bookings view
   is where pending money is chased.

   Ordered by the contact then the person, so a party stays together. */
export async function getEventPeople(eventId: string): Promise<EventPerson[]> {
    const rows = await db
        .select({
            id: partyMembers.id,
            name: partyMembers.name,
            birthYear: partyMembers.birthYear,
            birthMonth: partyMembers.birthMonth,
            birthDay: partyMembers.birthDay,
            tierLabel: partyMembers.tierLabel,
            priceCents: partyMembers.priceCents,
            shirtSize: partyMembers.shirtSize,
            vegetarianMeal: partyMembers.vegetarianMeal,
            attendedReunion2025: partyMembers.attendedReunion2025,
            isContact: partyMembers.isContact,
            registrationId: registrations.id,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            status: registrations.status,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        /* and(), not JS && — `eq(...) && inArray(...)` type-checks and silently discards the first
           condition, which here would mean serving every year at once. */
        .where(
            and(
                eq(registrations.eventId, eventId),
                inArray(registrations.status, ['paid', 'waived']),
            ),
        )
        .orderBy(asc(registrations.contactName), asc(partyMembers.name))

    return rows
}
