import { json } from '@sveltejs/kit'
import { and, eq, sql } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations, userProfiles } from '$lib/server/db/schema'
import type { RequestHandler } from './$types'

// All user profiles with their paid registration event IDs aggregated
export const GET: RequestHandler = async (event) => {
    requireAdmin(event)

    const profiles = await db
        .select({
            id: userProfiles.id,
            userId: userProfiles.userId,
            phone: userProfiles.phone,
            isDeleted: userProfiles.isDeleted,
            registeredEventIds: sql<
                string[]
            >`coalesce(array_agg(${registrations.eventId}) filter (where ${registrations.eventId} is not null), '{}'::uuid[])`,
        })
        .from(userProfiles)
        .leftJoin(
            registrations,
            and(eq(registrations.userId, userProfiles.userId), eq(registrations.status, 'paid')),
        )
        .groupBy(userProfiles.id)

    return json(profiles)
}
