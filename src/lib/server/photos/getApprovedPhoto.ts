import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import type { GalleryPhoto } from './getApprovedPhotos'

/* One approved photo, for its own shareable page. Undefined for anything pending, rejected or
   absent — the page 404s on all three alike, so the URL cannot report that a rejected photo once
   existed. */
export async function getApprovedPhoto(photoId: string): Promise<GalleryPhoto | undefined> {
    const [row] = await db
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
        .where(and(eq(photos.id, photoId), eq(photos.status, 'approved')))
        .limit(1)

    return row
}
