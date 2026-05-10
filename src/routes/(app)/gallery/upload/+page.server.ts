import { fail, redirect } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, photos } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { uploadFile, generateKey } from '$lib/server/storage'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAuth(event)

    const events = await db
        .select({ id: reunionEvents.id, title: reunionEvents.title, year: reunionEvents.year })
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))

    return { events }
}

export const actions: Actions = {
    default: async (event) => {
        const user = requireAuth(event)
        const formData = await event.request.formData()

        const eventId = formData.get('eventId') as string
        const caption = formData.get('caption') as string
        const file = formData.get('photo') as File

        if (!eventId || !file || file.size === 0) {
            return fail(400, { error: 'Please select a photo and event' })
        }

        dbg.upload('user=%s file=%s size=%d type=%s', user.id, file.name, file.size, file.type)

        if (file.size > 10 * 1024 * 1024) {
            dbg.upload('rejected: file too large (%d bytes)', file.size)
            return fail(400, { error: 'File must be under 10MB' })
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            dbg.upload('rejected: disallowed type %s', file.type)
            return fail(400, { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const key = generateKey('gallery', file.name)
        const url = await uploadFile(key, buffer, file.type)

        await db.insert(photos).values({
            eventId,
            uploadedByUserId: user.id,
            r2Key: key,
            url,
            caption: caption?.trim() || null,
        })

        dbg.upload('photo stored key=%s eventId=%s', key, eventId)

        throw redirect(303, '/gallery')
    },
}
