import { and, eq, sql } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations, user } from '$lib/server/db/schema'
import type { AdminUser } from './types'

/* All Better Auth users with paid registration event IDs aggregated by matching contact email; admin-only. */
export const getAdminUsers = query(async (): Promise<AdminUser[]> => {
    requireAdmin(getRequestEvent())

    return db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            registeredEventIds: sql<
                string[]
            >`coalesce(array_agg(${registrations.eventId}) filter (where ${registrations.eventId} is not null), '{}'::uuid[])`,
        })
        .from(user)
        .leftJoin(
            registrations,
            and(eq(registrations.contactEmail, user.email), eq(registrations.status, 'paid')),
        )
        .groupBy(user.id)
})
