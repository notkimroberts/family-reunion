import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, registrationStatusEnum } from '$lib/server/db/schema'

// Fetches a user's registration for a specific event, scoped to the provided status allowlist — caller decides which statuses are acceptable.
export async function getRegistration(
    userId: string,
    eventId: string,
    statuses: Array<(typeof registrationStatusEnum.enumValues)[number]>,
): Promise<typeof registrations.$inferSelect | undefined> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(
            and(
                eq(registrations.userId, userId),
                eq(registrations.eventId, eventId),
                inArray(registrations.status, statuses),
            ),
        )
        .limit(1)
    return registration
}
