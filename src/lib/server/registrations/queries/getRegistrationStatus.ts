import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, registrationStatusEnum } from '$lib/server/db/schema'

export async function getRegistrationStatus(
    registrationId: string,
    userId: string,
): Promise<(typeof registrationStatusEnum.enumValues)[number] | null> {
    const [registration] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(and(eq(registrations.id, registrationId), eq(registrations.userId, userId)))
        .limit(1)
    return registration?.status ?? null
}
