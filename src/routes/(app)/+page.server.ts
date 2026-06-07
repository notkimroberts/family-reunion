import { eq, and, count } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents, registrations } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const events = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

    if (events.length === 0) {
        return { event: null, registrantCount: 0, tiers: [] }
    }

    const event = events[0]

    const [{ value: registrantCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(and(eq(registrations.eventId, event.id), eq(registrations.status, 'paid')))

    const tiers = [...event.pricingTiers].sort((a, b) => a.minAge - b.minAge)

    return { event, registrantCount, tiers }
}
