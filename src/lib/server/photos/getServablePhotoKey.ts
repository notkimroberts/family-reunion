import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'

export type PhotoVariant = 'display' | 'thumb'

/* Resolves a photo id to the bucket key the public may be served, or undefined.

   THIS IS THE PUBLIC ACCESS CHECK, and it is why the bucket stays private. Filtering the gallery
   query is not sufficient on its own: ids are guessable in the sense that one leaks the moment a
   photo is approved and later un-approved, and an organiser rejecting something must make it
   instantly unreachable, not merely unlisted. Re-reading the status per request is what delivers
   that. Do not add a caching layer here that outlives a rejection. */
export async function getServablePhotoKey(
    photoId: string,
    variant: PhotoVariant,
): Promise<string | undefined> {
    const [row] = await db
        .select({
            status: photos.status,
            displayKey: photos.displayKey,
            thumbKey: photos.thumbKey,
        })
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1)

    if (!row || row.status !== 'approved') {
        return undefined
    }

    return variant === 'thumb' ? row.thumbKey : row.displayKey
}
