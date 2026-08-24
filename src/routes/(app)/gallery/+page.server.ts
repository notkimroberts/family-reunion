import { fail } from '@sveltejs/kit'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { photos, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { uploadFile, generateKey } from '$lib/server/storage'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async () => {
    const events = await db.select().from(reunionEvents).orderBy(desc(reunionEvents.year))

    const allPhotos = await db
        .select({
            id: photos.id,
            url: photos.url,
            caption: photos.caption,
            createdAt: photos.createdAt,
            eventId: photos.eventId,
            uploadedByUserId: photos.uploadedByUserId,
        })
        .from(photos)
        .orderBy(desc(photos.createdAt))

    return { events, photos: allPhotos }
}

export const actions: Actions = {
    upload: async (event) => {
        /* requireAdmin, not requireAuth: this writes a 10MB-capped file to the R2 bucket and a
           row to `photos`. A presence-only check made it an upload endpoint for any account. */
        const user = requireAdmin(event)
        const formData = await event.request.formData()
        const caption = formData.get('caption') as string
        const file = formData.get('photo') as File

        if (!file || file.size === 0) {
            return fail(400, { error: 'Please select a photo' })
        }

        if (file.size > 10 * 1024 * 1024) {
            dbg.upload('rejected: file too large (%d bytes)', file.size)
            return fail(400, { error: 'File must be under 10MB' })
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            dbg.upload('rejected: disallowed type %s', file.type)
            return fail(400, { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
        }

        const [openEvent] = await db
            .select({ id: reunionEvents.id })
            .from(reunionEvents)
            .where(eq(reunionEvents.status, 'open'))
            .orderBy(desc(reunionEvents.year))
            .limit(1)

        if (!openEvent) {
            return fail(400, { error: 'No active event to upload to' })
        }

        dbg.upload('user=%s file=%s size=%d type=%s', user.id, file.name, file.size, file.type)

        const buffer = Buffer.from(await file.arrayBuffer())
        const key = generateKey('gallery', file.name)
        const url = await uploadFile(key, buffer, file.type)

        await db.insert(photos).values({
            eventId: openEvent.id,
            uploadedByUserId: user.id,
            r2Key: key,
            url,
            caption: caption?.trim() || null,
        })

        dbg.upload('photo stored key=%s eventId=%s', key, openEvent.id)

        return { success: true }
    },
}
