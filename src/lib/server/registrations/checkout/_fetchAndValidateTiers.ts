import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents, type PricingTier } from '$lib/server/db/schema'

/* Reads the event's pricing tier list (JSONB) and validates that every requested tierId exists; throws 400 on mismatch. */
export async function fetchAndValidateTiers(
    eventId: string,
    tierIds: string[],
): Promise<Map<string, PricingTier>> {
    const [event] = await db
        .select({ pricingTiers: reunionEvents.pricingTiers })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    if (!event) {
        throw error(404, 'Event not found')
    }
    const tierMap = new Map(event.pricingTiers.map((t) => [t.id, t]))
    for (const id of tierIds) {
        if (!tierMap.has(id)) {
            throw error(400, 'Invalid pricing tier')
        }
    }
    return tierMap
}
