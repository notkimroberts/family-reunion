import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { announcements } from '$lib/server/db/schema'

export type Announcement = typeof announcements.$inferSelect

// Every announcement for one reunion, newest first
export async function getAnnouncementsForEvent(eventId: string): Promise<Announcement[]> {
    return db
        .select()
        .from(announcements)
        .where(eq(announcements.eventId, eventId))
        .orderBy(desc(announcements.createdAt))
}
