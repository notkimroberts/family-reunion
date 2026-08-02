import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)
}

export const actions: Actions = {
    create_event: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const title = data.get('title') as string
        const year = data.get('year') as string

        if (!title?.trim() || !year) {
            return fail(400, { error: 'Title and year required' })
        }

        await db.insert(reunionEvents).values({
            title: title.trim(),
            year: parseInt(year),
            status: 'draft',
            adultPriceCents: 0,
            childPriceCents: 0,
        })

        return { success: true }
    },

    update_status: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const eventId = data.get('eventId') as string
        const status = data.get('status') as string

        if (!eventId || !status) {
            return fail(400, { error: 'Missing fields' })
        }

        try {
            await db
                .update(reunionEvents)
                .set({ status: status as any, updatedAt: new Date() })
                .where(eq(reunionEvents.id, eventId))
        } catch (err: unknown) {
            /* Partial unique index `one_open_event` enforces at most one row with status='open'. Friendly-fail when the admin tries to open a second one. */
            if (
                typeof err === 'object' &&
                err !== null &&
                'code' in err &&
                (err as { code?: string }).code === '23505'
            ) {
                return fail(409, {
                    error: 'Another event is already open. Close it first before opening this one.',
                })
            }
            throw err
        }

        return { success: true }
    },
}
