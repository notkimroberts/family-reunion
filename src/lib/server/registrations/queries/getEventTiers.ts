import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { pricingTiers } from '$lib/server/db/schema'

// Returns all pricing tiers for an event ordered by minAge ascending, matching the age-bracket display order.
export async function getEventTiers(
    eventId: string,
): Promise<(typeof pricingTiers.$inferSelect)[]> {
    return db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.eventId, eventId))
        .orderBy(pricingTiers.minAge)
}
