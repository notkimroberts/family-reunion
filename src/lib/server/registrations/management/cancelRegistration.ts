import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'

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
