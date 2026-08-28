import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { hashManagementToken } from '../hashManagementToken'
import { isManagementTokenValid } from '../isManagementTokenValid'

/* Issues a partial refund for the member's recorded price (using the member id as a Stripe
   idempotency key so retries cannot double-refund), deletes the member row, then marks the
   registration 'refunded' if no members remain. If the refund fails the member row is NOT
   deleted — the action errors and the registrant can retry safely. Token-gated (compared
   by hash): 403 on mismatch. */
export async function removeMember(memberId: string, managementToken: string): Promise<void> {
    const tokenHash = hashManagementToken(managementToken)
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationId: partyMembers.registrationId,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            priceCents: partyMembers.priceCents,
            managementToken: registrations.managementToken,
            previousManagementToken: registrations.previousManagementToken,
            previousTokenExpiresAt: registrations.previousTokenExpiresAt,
            registrationStripeSessionId: registrations.stripeSessionId,
            registrationLockDate: reunionEvents.registrationLockDate,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    /* Grace-period aware, via the same predicate the page load uses. */
    if (!member || !isManagementTokenValid(member, tokenHash)) {
        throw error(403)
    }

    assertRegistrationEditable(member.registrationLockDate)

    let paymentIntentId = member.stripePaymentIntentId
    if (!paymentIntentId && member.registrationStripeSessionId) {
        try {
            paymentIntentId = await retrieveSessionPaymentIntent(member.registrationStripeSessionId)
        } catch (err) {
            dbg.register('could not retrieve payment intent for member=%s: %o', memberId, err)
        }
    }

    if (paymentIntentId) {
        try {
            /* Idempotency key: same memberId always refunds the same amount; Stripe returns
               the prior refund on retry instead of issuing a second one. */
            await refundPaymentIntent(
                paymentIntentId,
                member.priceCents,
                `remove-member-${memberId}`,
            )
            dbg.register(
                'partial refund issued for member=%s amount=%d',
                memberId,
                member.priceCents,
            )
        } catch (err) {
            dbg.register('refund failed for member=%s: %o', memberId, err)
            throw error(502, 'Refund failed; please try again')
        }
    }

    await db.delete(partyMembers).where(eq(partyMembers.id, memberId))

    const [anyRemaining] = await db
        .select({ id: partyMembers.id })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, member.registrationId))
        .limit(1)

    if (!anyRemaining) {
        await db
            .update(registrations)
            .set({ status: 'refunded', updatedAt: new Date() })
            .where(eq(registrations.id, member.registrationId))
        dbg.register('last member removed, registration %s marked refunded', member.registrationId)
    } else {
        await db
            .update(registrations)
            .set({ updatedAt: new Date() })
            .where(eq(registrations.id, member.registrationId))
    }
}
