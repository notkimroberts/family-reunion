import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { tiers } from '$lib/server/db/schema'

// Updates a tier's label and price. Admin-only — caller must guard.
export async function updateTier(
    tierId: string,
    updates: {
        label: string
        priceCents: number
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
