import { and, desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import type { ModerationPhoto } from './getPhotosForModeration'

/* The photos already published for one reunion year, for the admin lens.

   Separate from getPhotosForModeration, which is the pending INBOX and is deliberately unscoped.
   This is the opposite: everything already decided and attached to this year, so an organiser can
   see what the family can see and take something down after the fact. Without it the lens showed
   "nothing waiting" beside 290 published photos, which reads as data loss. */
export async function getEventPhotos(eventId: string): Promise<ModerationPhoto[]> {
    return db
        .select({
            id: photos.id,
            status: photos.status,
            width: photos.width,
            height: photos.height,
            caption: photos.caption,
            contributorName: photos.contributorName,
            takenYear: photos.takenYear,
            eventId: photos.eventId,
            createdAt: photos.createdAt,
        })
        .from(photos)
        .where(and(eq(photos.eventId, eventId), eq(photos.status, 'approved')))
        .orderBy(desc(photos.createdAt), desc(photos.id))
}
