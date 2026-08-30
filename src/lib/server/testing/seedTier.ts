import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '$lib/server/db/schema'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

/* A pricing tier on a reunion event, for the paths that resolve one — anything creating or
   repricing a party member. priceCents is the NET the reunion wants to receive; whether it is
   grossed up for Stripe is the caller's decision, not the tier's. */
export async function seedTier(
    db: TestDb,
    eventId: string,
    tier: { label?: string; priceCents?: number } = {},
) {
    const [row] = await db
        .insert(schema.tiers)
        .values({
            eventId,
            label: tier.label ?? 'Adult',
            priceCents: tier.priceCents ?? 16000,
        })
        .returning({ id: schema.tiers.id })
    return row.id
}
