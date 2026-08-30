import { error } from '@sveltejs/kit'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { tiers } from '$lib/server/db/schema'

export type TierPricing = {
    label: string
    priceCents: number
}

/* Validates every requested tier id belongs to the given event, then resolves each to its
   current label and price. Fail-closed: any id that isn't a tier on this event is a 400 (client
   sent a stale or foreign tier id).

   No shirt-size category: the tiers table used to carry an adult/child flag that this returned to
   four call sites and none of them read. The tier LABEL is what distinguishes an adult place from a
   child one, and it is what the order sheet groups by — see getPeopleSummary. */
export async function resolveTierPricing(
    eventId: string,
    tierIds: string[],
): Promise<Record<string, TierPricing>> {
    const uniqueIds = [...new Set(tierIds)]

    const rows = await db
        .select({
            id: tiers.id,
            label: tiers.label,
            priceCents: tiers.priceCents,
        })
        .from(tiers)
        .where(and(eq(tiers.eventId, eventId), inArray(tiers.id, uniqueIds)))

    if (rows.length !== uniqueIds.length) {
        throw error(400, 'Invalid tier selected')
    }

    return Object.fromEntries(rows.map(({ id, ...pricing }) => [id, pricing]))
}
