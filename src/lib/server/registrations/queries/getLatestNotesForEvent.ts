import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrationNotes, registrations } from '$lib/server/db/schema'
import type { RegistrationNote } from './getRegistrationNotes'

/* The newest note on each booking of one reunion, keyed by registration id, so the Follow up lens
   can show what was last said without a query per row. DISTINCT ON keeps one row per booking. */
export async function getLatestNotesForEvent(
    eventId: string,
): Promise<Record<string, RegistrationNote>> {
    const rows = await db
        .selectDistinctOn([registrationNotes.registrationId], {
            registrationId: registrationNotes.registrationId,
            id: registrationNotes.id,
            authorName: registrationNotes.authorName,
            body: registrationNotes.body,
            createdAt: registrationNotes.createdAt,
        })
        .from(registrationNotes)
        .innerJoin(registrations, eq(registrationNotes.registrationId, registrations.id))
        .where(eq(registrations.eventId, eventId))
        .orderBy(registrationNotes.registrationId, desc(registrationNotes.createdAt))

    return Object.fromEntries(rows.map(({ registrationId, ...note }) => [registrationId, note]))
}
