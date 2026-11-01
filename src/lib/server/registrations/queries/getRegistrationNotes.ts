import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrationNotes } from '$lib/server/db/schema'

export type RegistrationNote = {
    id: string
    authorName: string | null
    body: string
    createdAt: Date
}

// Every organizer note on one booking, newest first
export async function getRegistrationNotes(registrationId: string): Promise<RegistrationNote[]> {
    return db
        .select({
            id: registrationNotes.id,
            authorName: registrationNotes.authorName,
            body: registrationNotes.body,
            createdAt: registrationNotes.createdAt,
        })
        .from(registrationNotes)
        .where(eq(registrationNotes.registrationId, registrationId))
        .orderBy(desc(registrationNotes.createdAt))
}
