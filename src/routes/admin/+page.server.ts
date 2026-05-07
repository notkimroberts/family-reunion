import { eq, count, sum } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { userProfiles, registrations, reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const [{ value: totalUsers }] = await db.select({ value: count() }).from(userProfiles)
    const [{ value: totalRegistrations }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(eq(registrations.status, 'paid'))

    const [{ value: totalRevenue }] = await db
        .select({ value: sum(registrations.totalAmountCents) })
        .from(registrations)
        .where(eq(registrations.status, 'paid'))

    const events = await db.select().from(reunionEvents).orderBy(reunionEvents.year)

    return {
        metrics: {
            totalUsers,
            totalRegistrations,
            totalRevenueCents: Number(totalRevenue) || 0,
        },
        events,
    }
}
