import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)
    const events = await db.select().from(reunionEvents).orderBy(reunionEvents.year)
    return { events }
}

export const actions: Actions = {
    create_event: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const title = data.get('title') as string
        const year = data.get('year') as string

        if (!title?.trim() || !year) return fail(400, { error: 'Title and year required' })

        await db.insert(reunionEvents).values({
            title: title.trim(),
            year: parseInt(year),
            status: 'draft',
        })

        return { success: true }
    },

    update_status: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const eventId = data.get('eventId') as string
        const status = data.get('status') as string

        if (!eventId || !status) return fail(400, { error: 'Missing fields' })

        await db
            .update(reunionEvents)
            .set({ status: status as any, updatedAt: new Date() })
            .where(eq(reunionEvents.id, eventId))

        return { success: true }
    },
}
