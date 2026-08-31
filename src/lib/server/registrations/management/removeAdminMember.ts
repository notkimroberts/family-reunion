import { error } from '@sveltejs/kit'
import { count, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { assertRegistrationMutable, touchRegistration } from '../lifecycle'

/* Removes a party member who was never charged.

   REFUSES ON A PAID REGISTRATION, and this is the important part. Deleting the row would drop the
   attendee while keeping their money: the registration total would no longer match what Stripe holds,
   and nobody would be told. Nothing in the app now issues a PARTIAL refund — the token-gated
   removeMember that did was deleted with the rest of self-service — so the error names the route that
   does exist: cancel, which refunds in full, then re-enter the party. Do not relax this into a
   silent delete; give it back a real refund first.

   Note that partyMembers.stripePaymentIntentId is NOT a safe test for "was this charged": it is null
   for an abandoned checkout. The registration status is the reliable signal, so that is what gates
   this.

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
            isContact: partyMembers.isContact,
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
            'This registration is paid. Removing someone owes them a refund, and nothing here issues one — cancel the registration, which refunds it in full, and re-enter the party without them.',
        )
    }

    assertRegistrationMutable(
        member.registrationStatus,
        'This registration was cancelled and refunded.',
    )

    /* The contact's own attendee row carries the identity the registration is addressed to, and their
       name is written from registrations.contactName. Deleting it would leave a booking whose contact
       is not in the party, with no way to reach that state deliberately. Cancelling is the operation
       for "they are not coming". */
    if (member.isContact) {
        throw error(
            409,
            'This is the contact’s own place. Cancel the registration instead, or change who the contact is first.',
        )
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
    await touchRegistration(member.registrationId)

    dbg.register(
        'admin removed member %s from registration %s',
        params.memberId,
        member.registrationId,
    )

    return { removed: true, name: member.name, registrationId: member.registrationId }
}
