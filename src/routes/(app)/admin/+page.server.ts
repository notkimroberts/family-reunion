import { eq, countDistinct, sum } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { partyMembers, registrations, user } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [{ value: totalUsers }] = await db.select({ value: countDistinct(user.id) }).from(user)

    /* Revenue is computed by summing party_members.priceCents (registrations no longer carry a denormalized total). countDistinct on the registration id is required because the join multiplies rows. */
    const eventMetrics = await db
        .select({
            eventId: registrations.eventId,
            registrationCount: countDistinct(registrations.id),
            revenueCents: sum(partyMembers.priceCents),
        })
        .from(registrations)
        .innerJoin(partyMembers, eq(partyMembers.registrationId, registrations.id))
        .where(eq(registrations.status, 'paid'))
        .groupBy(registrations.eventId)

    return {
        totalUsers,
        eventMetrics,
    }
}
