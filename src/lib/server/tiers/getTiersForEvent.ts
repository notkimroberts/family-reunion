import { asc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { tiers } from '$lib/server/db/schema'

// Returns an event's tiers in creation order — the order admins see and set up tiers in is the order registrants see them
export async function getTiersForEvent(eventId: string): Promise<(typeof tiers.$inferSelect)[]> {
    return db.select().from(tiers).where(eq(tiers.eventId, eventId)).orderBy(asc(tiers.createdAt))
}
