import { and, eq, sql } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations, userProfiles } from '$lib/server/db/schema'
import type { Profile } from './types'

// All user profiles with paid registration event IDs aggregated; admin-only
export const getAdminUsers = query(async (): Promise<Profile[]> => {
    requireAdmin(getRequestEvent())

    return db
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
})
