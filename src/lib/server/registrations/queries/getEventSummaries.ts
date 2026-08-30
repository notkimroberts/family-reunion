import { count, countDistinct, desc, eq, sum } from 'drizzle-orm'
import type { EventStatus } from '$lib/general/constants'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'

export type EventSummary = {
    id: string
    title: string
    year: number
    status: EventStatus
    startDate: Date | null
    endDate: Date | null
    registrationLockDate: Date | null
    /* Paid AND waived: both have a place. Members, not bookings — a party of six is six chairs. */
    attendingPeople: number
    attendingParties: number
    pendingPeople: number
    pendingParties: number
    /* Paid only. A waived place brings in no money, so counting it would overstate the bank. */
    paidCents: number
    outstandingCents: number
}

/* Every reunion with its headline state, for the /admin landing page.

   TWO queries, not one per event. The obvious shape — list the events, then call
   getRegistrationsForEvent for each — is an N+1 that grows with the number of years the family keeps
   using this. One grouped roll-up answers all of them.

   Grouped by (event, status) rather than by event alone, because the same rows have to be split three
   ways: paid-and-waived are coming, pending is owed, refunded is neither. Folding that in SQL would need
   three conditional aggregates; folding it here is the same arithmetic getRegistrationTotals already does
   for one event, written once more against a wider set.

   countDistinct on the registration id is required: the party_members join multiplies rows, so a plain
   count would report a party of six as six bookings. */
export async function getEventSummaries(): Promise<EventSummary[]> {
    const [events, rollup] = await Promise.all([
        db
            .select({
                id: reunionEvents.id,
                title: reunionEvents.title,
                year: reunionEvents.year,
                status: reunionEvents.status,
                startDate: reunionEvents.startDate,
                endDate: reunionEvents.endDate,
                registrationLockDate: reunionEvents.registrationLockDate,
            })
            .from(reunionEvents)
            .orderBy(desc(reunionEvents.year)),
        db
            .select({
                eventId: registrations.eventId,
                status: registrations.status,
                parties: countDistinct(registrations.id),
                /* Left join so a registration whose members were all removed still counts as a party. */
                people: count(partyMembers.id),
                cents: sum(partyMembers.priceCents),
            })
            .from(registrations)
            .leftJoin(partyMembers, eq(partyMembers.registrationId, registrations.id))
            .groupBy(registrations.eventId, registrations.status),
    ])

    return events.map((event) => {
        const rows = rollup.filter((row) => row.eventId === event.id)
        const of = (...statuses: string[]) => rows.filter((row) => statuses.includes(row.status))
        const total = (picked: typeof rows, field: 'parties' | 'people' | 'cents'): number =>
            picked.reduce((sum, row) => sum + Number(row[field] ?? 0), 0)

        const attending = of('paid', 'waived')
        const pending = of('pending')

        return {
            ...event,
            attendingPeople: total(attending, 'people'),
            attendingParties: total(attending, 'parties'),
            pendingPeople: total(pending, 'people'),
            pendingParties: total(pending, 'parties'),
            paidCents: total(of('paid'), 'cents'),
            outstandingCents: total(pending, 'cents'),
        }
    })
}
