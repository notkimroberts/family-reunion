import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { _assertMemberInEvent } from './_assertMemberInEvent'

/* Records — or un-records — one attendee's arrival at the reunion.

   A TOGGLE rather than a one-way tick: a greeter with a queue will tap the wrong name, and undoing it
   has to be as cheap as doing it or the arrived count stops being true.

   NOT audited, unlike the other admin writes to somebody's party. A few hundred taps of "arrived"
   would bury the money and detail changes registration_audit exists to record, and the two columns
   here already say who and when.

   Last write wins, deliberately. Two greeters at two doors ticking the same family both mean the same
   thing, so a conflict is not a conflict.

   NOT gated on the registration's status: only paid and waived attendees reach the check-in list in
   the first place (getEventPeople), and touchRegistration is skipped too — arriving is not an edit to
   the booking, and bumping updatedAt would make the admin list look like it changed. */
export async function setMemberCheckedIn(params: {
    memberId: string
    /* The reunion the caller's URL claims. */
    eventId: string
    checkedIn: boolean
    adminId: string
}): Promise<{ name: string; checkedInAt: Date | null }> {
    const member = await _assertMemberInEvent(params.memberId, params.eventId)

    const checkedInAt = params.checkedIn ? new Date() : null

    await db
        .update(partyMembers)
        .set({ checkedInAt, checkedInBy: params.checkedIn ? params.adminId : null })
        .where(eq(partyMembers.id, params.memberId))

    dbg.register(
        'check-in %s for %s by %s',
        params.checkedIn ? 'recorded' : 'cleared',
        params.memberId,
        params.adminId,
    )

    return { name: member.name, checkedInAt }
}
