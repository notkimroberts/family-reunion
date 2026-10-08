import { and, count, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { getPublicDonationTotal } from '$lib/server/donations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    /* Only what the page renders. The page is public, and `metadata` is the program content that
       /program keeps behind the login — page data is readable in the source whether or not it renders. */
    const events = await db
        .select({
            id: reunionEvents.id,
            title: reunionEvents.title,
            startDate: reunionEvents.startDate,
            endDate: reunionEvents.endDate,
            registrationOpensAt: reunionEvents.registrationOpensAt,
            registrationLockDate: reunionEvents.registrationLockDate,
        })
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))

    if (events.length === 0) {
        return { event: null, registrantCount: 0, raised: { totalCents: 0, giftCount: 0 } }
    }

    const event = events[0]

    const [[{ value: registrantCount }], raised] = await Promise.all([
        db
            .select({ value: count() })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .where(and(eq(registrations.eventId, event.id), eq(registrations.status, 'paid'))),
        getPublicDonationTotal(event.id),
    ])

    return { event, registrantCount, raised }
}
