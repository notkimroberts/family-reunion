import { error } from '@sveltejs/kit'
import { count, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

/* Removes a party member who was never charged.

   REFUSES ON A PAID REGISTRATION, and this is the important part. removeMember (the token-gated one)
   issues a partial refund before deleting, keyed on the member id so a retry cannot double-refund.
   Deleting the row here without that would drop the attendee while keeping their money — the
   registration total would no longer match what Stripe holds, and nobody would be told. Refunds stay
   on the path that actually issues them.

   Note that partyMembers.stripePaymentIntentId is NOT a safe test for "was this charged": it is null
   for an abandoned checkout and removeMember itself falls back to looking the intent up from the
   registration's session. The registration status is the reliable signal, so that is what gates this.

   Also refuses to empty a party: a registration with no members is a row nothing can be done with,
   and it silently disappears from any member-joined report. Cancelling is the operation for that,
   and for a paid party it owes a refund. */
export async function removeAdminMember(params: {
    memberId: string
}): Promise<{ removed: boolean; name: string; registrationId: string }> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            name: partyMembers.name,
            registrationId: partyMembers.registrationId,
            registrationStatus: registrations.status,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, params.memberId))
        .limit(1)

    if (!member) {
        throw error(404, 'Party member not found')
    }

    if (member.registrationStatus === 'paid') {
        throw error(
            409,
            'This registration is paid. Removing someone owes them a refund — use the registrant’s management link so the money actually goes back.',
        )
    }

    if (member.registrationStatus === 'refunded') {
        throw error(409, 'This registration was cancelled and refunded.')
    }

    const [{ total }] = await db
        .select({ total: count(partyMembers.id) })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, member.registrationId))

    if (Number(total) <= 1) {
        throw error(
            409,
            'This is the only person on the registration. Cancel the registration instead of emptying it.',
        )
    }

    await db.delete(partyMembers).where(eq(partyMembers.id, params.memberId))
    await db
        .update(registrations)
        .set({ updatedAt: new Date() })
        .where(eq(registrations.id, member.registrationId))

    dbg.register(
        'admin removed member %s from registration %s',
        params.memberId,
        member.registrationId,
    )

    return { removed: true, name: member.name, registrationId: member.registrationId }
}
