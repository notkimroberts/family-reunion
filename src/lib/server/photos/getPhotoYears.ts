import { count, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'

export type PhotoYear = { year: number; photoCount: number }

/* The years the gallery can be filtered and downloaded by, newest first.

   Only years with at least one APPROVED photo appear, so a year cannot be offered as a download
   that turns out to be empty. Photos with no year are excluded rather than bucketed into a
   "unknown" pseudo-year: they are still browsable in the full grid, and a zip named for a year
   should contain only photos actually from it. */
export async function getPhotoYears(): Promise<PhotoYear[]> {
    return db
        .select({ year: photos.takenYear, photoCount: count() })
        .from(photos)
        .where(eq(photos.status, 'approved'))
        .groupBy(photos.takenYear)
        .having(isNotNull(photos.takenYear))
        .orderBy(desc(photos.takenYear)) as Promise<PhotoYear[]>
}
