import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { _assertMemberInEvent } from './_assertMemberInEvent'

/* Records that this attendee has been handed their shirt, or takes it back off.

   Its own write, and its own column, because it is its own fact: a shirt is given out at the same table
   as the tick but not always at the same moment — a box arrives late, a size ran out, or the size was
   never recorded and the person has to be caught afterwards. See the schema comment on shirtGivenAt.

   A toggle for the same reason arrivals are one: the correction has to be as cheap as the mistake.

   Deliberately does NOT check that a size is recorded. Somebody who takes a shirt has taken it whether
   or not the form ever said which one, and refusing to record that would leave the greeter with no way
   to say what happened. The missing size is shown as a gap to chase instead. */
export async function setShirtGiven(params: {
    memberId: string
    /* The reunion the caller's URL claims. */
    eventId: string
    given: boolean
}): Promise<{ name: string; shirtGivenAt: Date | null }> {
    const member = await _assertMemberInEvent(params.memberId, params.eventId)

    const shirtGivenAt = params.given ? new Date() : null

    await db.update(partyMembers).set({ shirtGivenAt }).where(eq(partyMembers.id, params.memberId))

    dbg.register('shirt %s for %s', params.given ? 'handed over' : 'un-recorded', params.memberId)

    return { name: member.name, shirtGivenAt }
}
