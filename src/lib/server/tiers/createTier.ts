import { db } from '$lib/server/db'
import { shirtSizeCategoryEnum, tiers } from '$lib/server/db/schema'

// Creates a tier for an event. Admin-only — caller must guard.
export async function createTier(params: {
    eventId: string
    label: string
    priceCents: number
    shirtSizeCategory: (typeof shirtSizeCategoryEnum.enumValues)[number]
}): Promise<typeof tiers.$inferSelect> {
    const [tier] = await db.insert(tiers).values(params).returning()
    return tier
}
