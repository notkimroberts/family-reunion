import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents, type PricingTier } from '$lib/server/db/schema'

/* Returns all pricing tiers for an event ordered by minAge ascending. */
export async function getEventTiers(eventId: string): Promise<PricingTier[]> {
    const [event] = await db
        .select({ pricingTiers: reunionEvents.pricingTiers })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    if (!event) {
        return []
    }
    return [...event.pricingTiers].sort((a, b) => a.minAge - b.minAge)
}
