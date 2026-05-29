import { fail } from '@sveltejs/kit'
import { and, eq, sql } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations, userProfiles } from '$lib/server/db/schema'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
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

    return { profiles }
}

export const actions: Actions = {
    update_user: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const profileId = data.get('profileId') as string
        const phone = data.get('phone') as string

        if (!profileId) {
            return fail(400, { error: 'Missing profile ID' })
        }

        await db
            .update(userProfiles)
            .set({ phone: phone || null, updatedAt: new Date() })
            .where(eq(userProfiles.id, profileId))

        return { success: true }
    },
}
