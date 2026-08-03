import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { refundPaymentIntent, retrieveSessionPaymentIntent } from '$lib/server/payments'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { getRegistrationLockDate } from '../getRegistrationLockDate'
import { getRegistrationByToken } from '../queries/getRegistrationByToken'

/* Refunds all distinct Stripe payment intents for the registration, then marks it 'refunded'. Falls back to session-level intent when members lack per-member intent IDs. Token-gated (compared by hash): 404 on mismatch. */
export async function cancelRegistration(
    registrationId: string,
    managementToken: string,
): Promise<void> {
    const registration = await getRegistrationByToken(managementToken)
    if (!registration || registration.id !== registrationId) {
        throw error(404)
    }

    assertRegistrationEditable(await getRegistrationLockDate(registration.eventId))

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
            /* Per-intent idempotency key keyed on the cancellation: a Stripe redelivery or
               a user-double-click won't issue a second refund. */
            return refundPaymentIntent(
                intentId,
                undefined,
                `cancel-registration-${registrationId}-${intentId}`,
            ).catch((err) => {
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
