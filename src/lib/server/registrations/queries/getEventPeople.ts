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
    /* Where they live, for the CSV export. */
    addressCity: string | null
    addressState: string | null
    addressZip: string | null
    vegetarianMeal: boolean | null
    attendedReunion2025: boolean | null
    isContact: boolean
    registrationId: string
    contactName: string
    contactEmail: string
    status: (typeof registrationStatusEnum.enumValues)[number]
    /* Added after the booking was paid and not paid for, so the People lens can show Payment due
       rather than the booking's Paid — see getPersonDisplayStatus. */
    paymentDue: boolean
    /* When they arrived, recorded from the check-in page. NULL means not arrived. */
    checkedInAt: Date | null
    checkedInBy: string | null
    /* When they were handed their shirt. NULL means not yet — its own fact, not a detail of arriving. */
    shirtGivenAt: Date | null
}

/* One row per PERSON rather than per booking — the same event, seen through a different lens.

   This is the list you work from on the day and the one catering and shirt orders come off: a party of
   six is six chairs, six meals and six shirts, and the bookings view collapses it to a single row.

   'paid' and 'waived' only. A pending registration is not an attendee yet and a refunded one is not one
   any more, so including either would inflate every count an organizer reads off this. The bookings view
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
            addressCity: partyMembers.addressCity,
            addressState: partyMembers.addressState,
            addressZip: partyMembers.addressZip,
            vegetarianMeal: partyMembers.vegetarianMeal,
            attendedReunion2025: partyMembers.attendedReunion2025,
            isContact: partyMembers.isContact,
            registrationId: registrations.id,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            status: registrations.status,
            paymentDue: partyMembers.paymentDue,
            checkedInAt: partyMembers.checkedInAt,
            checkedInBy: partyMembers.checkedInBy,
            shirtGivenAt: partyMembers.shirtGivenAt,
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
