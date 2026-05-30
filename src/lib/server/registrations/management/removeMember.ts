import { error } from '@sveltejs/kit'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, pricingTiers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'

export async function removeMember(memberId: string, userId: string): Promise<void> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationId: partyMembers.registrationId,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            priceCents: pricingTiers.priceCents,
            registrationUserId: registrations.userId,
            registrationStripeSessionId: registrations.stripeSessionId,
        })
        .from(partyMembers)
        .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    if (!member || member.registrationUserId !== userId) {
        throw error(403)
    }

    try {
        let paymentIntentId = member.stripePaymentIntentId
        if (!paymentIntentId && member.registrationStripeSessionId) {
            paymentIntentId = await retrieveSessionPaymentIntent(member.registrationStripeSessionId)
        }
        if (paymentIntentId) {
            await refundPaymentIntent(paymentIntentId, member.priceCents)
            dbg.register(
                'partial refund issued for member=%s amount=%d',
                memberId,
                member.priceCents,
            )
        }
    } catch (err) {
        dbg.register('refund failed for member=%s: %o', memberId, err)
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
            .set({ status: 'refunded', totalAmountCents: 0, updatedAt: new Date() })
            .where(eq(registrations.id, member.registrationId))
        dbg.register('last member removed, registration %s marked refunded', member.registrationId)
    } else {
        await db
            .update(registrations)
            .set({
                totalAmountCents: sql`${registrations.totalAmountCents} - ${member.priceCents}`,
                updatedAt: new Date(),
            })
            .where(eq(registrations.id, member.registrationId))
    }
}
