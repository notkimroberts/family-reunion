import { desc, eq } from 'drizzle-orm'
import { query } from '$app/server'
import { getRequestEvent } from '$app/server'
import { requireOwner } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { photos, reunionEvents } from '$lib/server/db/schema'
import type { Photo } from './types'

/* Every gallery photo with the reunion it belongs to. Owner-only: remote functions bypass route handling
   entirely, so this guard is the only thing protecting the data.

   INNER join, not left. photos.eventId is NOT NULL with a foreign key, so the join cannot miss — the
   left join only made eventTitle LOOK nullable, which put a dead "no reunion" branch on the page and
   invited a reader to build for a state the schema forbids.

   Newest first: the page shows every year at once now that the admin year filter is gone. */
export const getAdminPhotos = query(async (): Promise<Photo[]> => {
    requireOwner(getRequestEvent())

    return db
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
        .innerJoin(reunionEvents, eq(photos.eventId, reunionEvents.id))
        .orderBy(desc(reunionEvents.year), desc(photos.createdAt))
})
