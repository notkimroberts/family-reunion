import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'

export type GalleryPhoto = {
    id: string
    width: number
    height: number
    caption: string | null
    contributorName: string | null
    takenYear: number | null
    createdAt: Date
}

/* The public gallery, newest first.

   Filters on 'approved' and returns no bucket keys: the browser addresses a photo by its id through
   the byte proxy, which re-checks the status. Leaking a key would not itself expose anything, the
   bucket being private, but there is no reason for one to leave the server. */
export async function getApprovedPhotos(): Promise<GalleryPhoto[]> {
    return db
        .select({
            id: photos.id,
            width: photos.width,
            height: photos.height,
            caption: photos.caption,
            contributorName: photos.contributorName,
            takenYear: photos.takenYear,
            createdAt: photos.createdAt,
        })
        .from(photos)
        .where(eq(photos.status, 'approved'))
        .orderBy(desc(photos.createdAt))
}
