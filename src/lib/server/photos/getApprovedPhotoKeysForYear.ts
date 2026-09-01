import { and, asc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'

export type DownloadablePhoto = { id: string; displayKey: string; takenYear: number | null }

/* The display renditions for one year, for the zip.

   Returns keys, unlike every other public read — the caller streams the objects rather than handing
   the keys to a browser. Ordered by createdAt so the zip's contents are stable between runs, which
   matters if someone downloads twice and compares. */
export async function getApprovedPhotoKeysForYear(year: number): Promise<DownloadablePhoto[]> {
    return db
        .select({ id: photos.id, displayKey: photos.displayKey, takenYear: photos.takenYear })
        .from(photos)
        .where(and(eq(photos.status, 'approved'), eq(photos.takenYear, year)))
        .orderBy(asc(photos.createdAt))
}
