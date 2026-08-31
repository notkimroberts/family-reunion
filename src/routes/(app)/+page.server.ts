import { and, count, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { getPublicDonationTotal } from '$lib/server/donations'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const events = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

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
