import { eq, count, sum } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { userProfiles, registrations } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [{ value: totalUsers }] = await db.select({ value: count() }).from(userProfiles)

    const eventMetrics = await db
        .select({
            eventId: registrations.eventId,
            registrationCount: count(),
            revenueCents: sum(registrations.totalAmountCents),
        })
        .from(registrations)
        .where(eq(registrations.status, 'paid'))
        .groupBy(registrations.eventId)

    return {
        totalUsers,
        eventMetrics,
    }
}
