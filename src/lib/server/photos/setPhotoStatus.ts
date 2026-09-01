import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'

/* Approves or rejects one photo.

   A rejected photo keeps its row and its objects rather than being deleted. That is deliberate: it
   records that a decision was made, so the same image re-uploaded by the same person does not read
   as a new arrival, and an organiser who mis-taps can undo it. Purging is a separate, explicit act
   — see deletePhoto. */
export async function setPhotoStatus(
    photoId: string,
    status: 'approved' | 'rejected',
): Promise<void> {
    await db.update(photos).set({ status, updatedAt: new Date() }).where(eq(photos.id, photoId))
}
