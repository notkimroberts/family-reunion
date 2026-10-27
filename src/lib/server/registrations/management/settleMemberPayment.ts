import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import type { MemberSettlement } from '$lib/general/constants'
import { db } from '$lib/server/db'
import { partyMembers } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { touchRegistration } from '../lifecycle'

/* Records that a person added to a paid booking no longer owes anything.

   'paid' keeps the net price: Zelle and checks cost the reunion no fee, so the net is what arrived.
   'covered' sets the price to zero. There is no per-member "waived" status, and a covered place left
   at its tier price would be counted as money banked on a paid booking.

   A card payment does not come through here. The webhook clears the flag itself and records the gross
   it charged — see fulfillMemberPayment.

   The update is conditional on the flag, so two organizers settling the same person at once cannot
   both succeed, and settling someone the card payment already settled is refused rather than
   overwriting the price the card paid. */
export async function settleMemberPayment(params: {
    registrationId: string
    memberId: string
    settlement: MemberSettlement
}): Promise<{ name: string }> {
    /* No status check: only a paid booking has owed places, because leaving 'paid' clears the flag
       (setRegistrationStatus, markRegistrationRefunded). The flag in the WHERE is the whole guard. */
    const [settled] = await db
        .update(partyMembers)
        .set({
            paymentDue: false,
            /* Recorded so the row reads as paid by hand or comped, not as an abandoned checkout. */
            settlement: params.settlement,
            ...(params.settlement === 'covered' ? { priceCents: 0 } : {}),
        })
        .where(
            and(
                eq(partyMembers.id, params.memberId),
                eq(partyMembers.registrationId, params.registrationId),
                eq(partyMembers.paymentDue, true),
            ),
        )
        .returning({ name: partyMembers.name })

    if (!settled) {
        throw error(409, 'Nothing is owed for this person. Reload the page to see the latest.')
    }

    await touchRegistration(params.registrationId)

    dbg.register(
        'admin settled member %s on registration %s as %s',
        params.memberId,
        params.registrationId,
        params.settlement,
    )

    return { name: settled.name }
}
