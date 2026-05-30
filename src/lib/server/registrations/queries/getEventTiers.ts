import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { pricingTiers } from '$lib/server/db/schema'

export async function getEventTiers(
    eventId: string,
): Promise<(typeof pricingTiers.$inferSelect)[]> {
    return db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.eventId, eventId))
        .orderBy(pricingTiers.minAge)
}
