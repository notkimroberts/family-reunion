import { resolveActorUserId } from '$lib/server/auth/resolveActorUserId'
import { db } from '$lib/server/db'
import { registrationNotes } from '$lib/server/db/schema'

/* Appends one organizer note to a booking. Unlike recordRegistrationAudit this throws: the note IS
   the change the organizer asked for, so a failed write must fail the save. */
export async function addRegistrationNote(params: {
    registrationId: string
    author: { id: string; name: string }
    body: string
}): Promise<void> {
    await db.insert(registrationNotes).values({
        registrationId: params.registrationId,
        authorUserId: await resolveActorUserId(params.author.id),
        authorName: params.author.name,
        body: params.body,
    })
}
