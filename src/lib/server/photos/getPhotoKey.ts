import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import type { PhotoVariant } from './getServablePhotoKey'

/* Resolves a key with NO status check.

   For the moderation queue only: an organiser cannot decide on a photo they are not allowed to
   look at. Every caller must have passed requireAdmin first. Public paths use
   getServablePhotoKey, which is the one that enforces 'approved'. */
export async function getPhotoKey(
    photoId: string,
    variant: PhotoVariant,
): Promise<string | undefined> {
    const [row] = await db
        .select({ displayKey: photos.displayKey, thumbKey: photos.thumbKey })
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1)

    if (!row) {
        return undefined
    }
    return variant === 'thumb' ? row.thumbKey : row.displayKey
}
