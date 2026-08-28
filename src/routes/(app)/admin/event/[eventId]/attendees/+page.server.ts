import { error, fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { getAttendeesForEvent, linkPartyMember } from '$lib/server/registrations'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* The query moved into $lib/server/registrations/queries — this was the only admin loader still
       assembling raw db.select() calls inline, and it was also the one place the event filter was
       missing entirely. */
    const { attendees, members } = await getAttendeesForEvent(event.params.eventId)

    return { attendees, members }
}

export const actions: Actions = {
    link: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const partyMemberId = String(data.get('partyMemberId') ?? '').trim()
        const familyMemberId = String(data.get('familyMemberId') ?? '').trim() || null

        if (!partyMemberId) {
            return fail(400, { error: 'Missing party member' })
        }

        /* The URL now claims a scope, so the action has to enforce it. Before the move this took an id
           from the request body and linked it with no reference to any event — under an event-scoped
           URL that would let a POST aimed at one year quietly modify an attendee of another. */
        const [owner] = await db
            .select({ eventId: registrations.eventId })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .where(eq(partyMembers.id, partyMemberId))
            .limit(1)

        if (!owner || owner.eventId !== event.params.eventId) {
            throw error(404, 'Attendee not found for this event')
        }

        await linkPartyMember(partyMemberId, familyMemberId)
        return { success: true }
    },
}
