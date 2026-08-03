import { redirect } from '@sveltejs/kit'
import { eq, and, count } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents, registrations, partyMembers } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const events = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

    if (events.length === 0) {
        const archived = await db.select().from(reunionEvents).orderBy(reunionEvents.year)

        if (archived.length > 0) {
            throw redirect(302, `/program/${archived[archived.length - 1].year}`)
        }

        return { event: null, registrantCount: 0 }
    }

    const event = events[0]

    const [{ value: registrantCount }] = await db
        .select({ value: count() })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(and(eq(registrations.eventId, event.id), eq(registrations.status, 'paid')))

    return { event, registrantCount }
}
