import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { shirtSizeCategoryEnum, tiers } from '$lib/server/db/schema'

// Updates a tier's label/price/shirt-size-category. Admin-only — caller must guard.
export async function updateTier(
    tierId: string,
    updates: {
        label: string
        priceCents: number
        shirtSizeCategory: (typeof shirtSizeCategoryEnum.enumValues)[number]
    },
): Promise<void> {
    const result = await db
        .update(tiers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tiers.id, tierId))
        .returning({ id: tiers.id })

    if (result.length === 0) {
        throw error(404, 'Tier not found')
    }
}
