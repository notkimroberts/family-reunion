import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { tiers } from '$lib/server/db/schema'

/* Deletes a tier. party_members rows that used it keep their tierLabel/priceCents snapshot
   untouched — there is no live reference from party_members to tiers, so deleting a tier
   can never change historical registrations. Admin-only — caller must guard. */
export async function deleteTier(tierId: string): Promise<void> {
    await db.delete(tiers).where(eq(tiers.id, tierId))
}
