import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { photos, reunionEvents } from '$lib/server/db/schema'
import type { RequestHandler } from './$types'

// All photos joined with their event title
export const GET: RequestHandler = async (event) => {
    requireAdmin(event)

    const allPhotos = await db
        .select({
            id: photos.id,
            url: photos.url,
            caption: photos.caption,
            r2Key: photos.r2Key,
            eventId: photos.eventId,
            createdAt: photos.createdAt,
            uploadedByUserId: photos.uploadedByUserId,
            eventTitle: reunionEvents.title,
        })
        .from(photos)
        .leftJoin(reunionEvents, eq(photos.eventId, reunionEvents.id))

    return json(allPhotos)
}
