import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'

/* Resolves an attendee, but ONLY within the reunion the caller named.

   The member id arrives from the client on every door write, so the pairing is verified rather than
   trusted: without this, a request aimed at one year could tick an attendee of another. Same invariant
   the registrations page's update_person action holds, shared by the two door writes so neither can
   quietly lose it. */
export async function _assertMemberInEvent(
    memberId: string,
    eventId: string,
): Promise<{ id: string; name: string }> {
    const [member] = await db
        .select({ id: partyMembers.id, name: partyMembers.name })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(and(eq(partyMembers.id, memberId), eq(registrations.eventId, eventId)))
        .limit(1)

    if (!member) {
        throw error(404, 'Attendee not found for this event')
    }

    return member
}
