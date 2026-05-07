import { eq, desc } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos, reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

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
