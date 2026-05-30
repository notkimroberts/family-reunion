import { error } from '@sveltejs/kit'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, pricingTiers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'
import { parseBirthDate } from '$lib/utils/age'

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

export async function cancelRegistration(registrationId: string, userId: string): Promise<void> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(and(eq(registrations.id, registrationId), eq(registrations.userId, userId)))
        .limit(1)
    if (!registration) {
        throw error(404)
    }

    const members = await db
        .select({ stripePaymentIntentId: partyMembers.stripePaymentIntentId })
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))

    const uniqueIntents = new Set<string>()
    for (const m of members) {
        if (m.stripePaymentIntentId) {
            uniqueIntents.add(m.stripePaymentIntentId)
        }
    }

    if (uniqueIntents.size === 0 && registration.stripeSessionId) {
        try {
            const intentId = await retrieveSessionPaymentIntent(registration.stripeSessionId)
            if (intentId) {
                uniqueIntents.add(intentId)
            }
        } catch (err) {
            dbg.register(
                'could not retrieve payment intent for cancel of registration %s: %o',
                registrationId,
                err,
            )
        }
    }

    await Promise.all(
        Array.from(uniqueIntents).map((intentId) => {
            dbg.register('full refund issued for payment_intent=%s', intentId)
            return refundPaymentIntent(intentId).catch((err) => {
                dbg.register('refund failed for payment_intent=%s: %o', intentId, err)
            })
        }),
    )

    await db
        .update(registrations)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(registrations.id, registrationId))

    dbg.register('registration %s cancelled and refunded', registrationId)
}

export async function updateMemberDetails(
    memberId: string,
    data: { birthDate?: string; shirtSize?: string },
    userId: string,
): Promise<void> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            registrationUserId: registrations.userId,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, memberId))
        .limit(1)

    if (!member || member.registrationUserId !== userId) {
        throw error(403)
    }

    const parsed = data.birthDate ? parseBirthDate(data.birthDate) : null
    await db
        .update(partyMembers)
        .set({
            birthYear: parsed?.birthYear ?? null,
            birthMonth: parsed?.birthMonth ?? null,
            birthDay: parsed?.birthDay ?? null,
            shirtSize: data.shirtSize || null,
        })
        .where(eq(partyMembers.id, memberId))
    dbg.register('updateMemberDetails memberId=%s', memberId)
}
