import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { pricingTiers } from '$lib/server/db/schema'

// Fetches all pricing tiers for the event and throws 400 if any requested tierId is not among them
export async function fetchAndValidateTiers(
    eventId: string,
    tierIds: string[],
): Promise<Map<string, typeof pricingTiers.$inferSelect>> {
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, eventId))
    const tierMap = new Map(tiers.map((t) => [t.id, t]))
    for (const id of tierIds) {
        if (!tierMap.has(id)) {
            throw error(400, 'Invalid pricing tier')
        }
    }
    return tierMap
}
