import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { auth } from '$lib/server/auth'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { userProfiles } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const profiles = await db.select().from(userProfiles)

    return { profiles }
}

export const actions: Actions = {
    update_user: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const profileId = data.get('profileId') as string
        const phone = data.get('phone') as string

        if (!profileId) return fail(400, { error: 'Missing profile ID' })

        await db
            .update(userProfiles)
            .set({ phone: phone || null, updatedAt: new Date() })
            .where(eq(userProfiles.id, profileId))

        return { success: true }
    },
}
