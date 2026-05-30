import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, registrationStatusEnum } from '$lib/server/db/schema'

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
