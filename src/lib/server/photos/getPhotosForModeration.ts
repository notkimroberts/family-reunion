import { asc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import type { photoStatusEnum } from '$lib/server/db/schema'

export type ModerationPhoto = {
    id: string
    status: (typeof photoStatusEnum.enumValues)[number]
    width: number
    height: number
    caption: string | null
    contributorName: string | null
    takenYear: number | null
    eventId: string | null
    createdAt: Date
}

/* The moderation queue: everything awaiting a decision, oldest first, because the oldest has been
   waiting longest and nothing is public until someone looks at it. */
export async function getPhotosForModeration(): Promise<ModerationPhoto[]> {
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
        .where(eq(photos.status, 'pending'))
        .orderBy(asc(photos.createdAt))
}
