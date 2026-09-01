import { and, desc, eq } from 'drizzle-orm'
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

/* The public gallery, newest first, optionally one year only.

   Ordered on the TUPLE (createdAt, id), not createdAt alone. Two photos uploaded in the same
   millisecond would otherwise have no defined order between them, and getPhotoNeighbours walks the
   same sequence to work out prev/next — if the two orderings disagree, arrow navigation silently
   skips a photo or loops between two. A total order in both places is what stops that.

   Filters on 'approved' and returns no bucket keys: the browser addresses a photo by its id through
   the byte proxy, which re-checks the status. Leaking a key would not itself expose anything, the
   bucket being private, but there is no reason for one to leave the server. */
export async function getApprovedPhotos(year?: number): Promise<GalleryPhoto[]> {
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
        .where(
            year === undefined
                ? eq(photos.status, 'approved')
                : and(eq(photos.status, 'approved'), eq(photos.takenYear, year)),
        )
        .orderBy(desc(photos.createdAt), desc(photos.id))
}
