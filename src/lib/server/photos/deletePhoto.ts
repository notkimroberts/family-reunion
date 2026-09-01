import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import { deleteObjects } from '$lib/server/storage'

/* Removes a photo and its objects for good.

   The row holds the only pointers to the bucket objects, so the objects go FIRST. Dropping the row
   first and failing on the bucket call would orphan the bytes with nothing left in the app able to
   name them — precisely what happened to the R2 bucket when ADR 0005 dropped the old photos table.
   deleteObjects tolerates keys that are already gone, so this is safe to retry. */
export async function deletePhoto(photoId: string): Promise<void> {
    const [row] = await db
        .select({ displayKey: photos.displayKey, thumbKey: photos.thumbKey })
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1)

    if (!row) {
        return
    }

    await deleteObjects([row.displayKey, row.thumbKey])
    await db.delete(photos).where(eq(photos.id, photoId))
}
