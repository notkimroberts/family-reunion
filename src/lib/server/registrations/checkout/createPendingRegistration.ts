import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations, userProfiles } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createRegistrationCheckout } from '$lib/server/payments'
import { parseBirthDate } from '$lib/utils/age'
import type { MemberInput } from './MemberInput'
import { fetchAndValidateTiers } from './_fetchAndValidateTiers'
import { calculateTotal } from './calculateTotal'

// Creates a 'pending' registration + party members, then opens a Stripe Checkout session; caller must redirect to checkoutUrl
export async function createPendingRegistration(params: {
    userId: string
    userName: string
    eventId: string
    selfTierId: string
    selfBirthDate?: string
    selfShirtSize?: string
    additionalMembers: MemberInput[]
    successUrl: (registrationId: string) => string
    cancelUrl: (registrationId: string) => string
}): Promise<{ registrationId: string; checkoutUrl: string }> {
    const allTierIds = [params.selfTierId, ...params.additionalMembers.map((m) => m.tierId)]
    const tierMap = await fetchAndValidateTiers(params.eventId, allTierIds)
    const selfTier = tierMap.get(params.selfTierId)!

    if (params.selfBirthDate) {
        const parsed = parseBirthDate(params.selfBirthDate)
        if (parsed) {
            await db
                .insert(userProfiles)
                .values({ userId: params.userId, ...parsed })
                .onConflictDoUpdate({
                    target: userProfiles.userId,
                    set: { ...parsed, updatedAt: new Date() },
                })
        }
    }

    const { totalCents, lineItems } = calculateTotal(
        params.userName,
        selfTier,
        params.additionalMembers,
        tierMap,
    )

    const [registration] = await db
        .insert(registrations)
        .values({
            userId: params.userId,
            eventId: params.eventId,
            totalAmountCents: totalCents,
            status: 'pending',
        })
        .returning()

    const selfParsed = params.selfBirthDate ? parseBirthDate(params.selfBirthDate) : null
    await db.insert(partyMembers).values([
        {
            registrationId: registration.id,
            name: params.userName,
            birthYear: selfParsed?.birthYear ?? null,
            birthMonth: selfParsed?.birthMonth ?? null,
            birthDay: selfParsed?.birthDay ?? null,
            shirtSize: params.selfShirtSize || null,
            pricingTierId: selfTier.id,
        },
        ...params.additionalMembers.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            return {
                registrationId: registration.id,
                name: m.name,
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                pricingTierId: m.tierId,
            }
        }),
    ])

    dbg.register('registration created id=%s, creating stripe session', registration.id)

    const { url: checkoutUrl, sessionId } = await createRegistrationCheckout({
        lineItems,
        registrationId: registration.id,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })

    await db
        .update(registrations)
        .set({ stripeSessionId: sessionId })
        .where(eq(registrations.id, registration.id))

    dbg.register('stripe session=%s created', sessionId)
    return { registrationId: registration.id, checkoutUrl }
}
