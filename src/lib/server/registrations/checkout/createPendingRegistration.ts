import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createRegistrationCheckout } from '$lib/server/payments'
import { parseBirthDate } from '$lib/utils/age'
import { generateManagementToken } from '../hashManagementToken'
import type { MemberInput } from './MemberInput'
import { fetchAndValidateTiers } from './_fetchAndValidateTiers'
import { calculateTotal } from './calculateTotal'

/* Creates a 'pending' registration + party members, then opens a Stripe Checkout session.
   Each registration gets a permanent managementToken used as the ownership credential.
   The DB stores only the SHA-256 hash; the plaintext is returned to the caller, baked
   into the Stripe success URL, and carried through Stripe metadata so the webhook can
   build the manage-URL in the confirmation email.

   We deliberately do NOT delete prior pending rows for this contactEmail — that would be
   an unauthenticated DOS vector (any visitor could submit the form with a victim's email
   and clobber their in-flight checkout). Stale pendings expire naturally with the Stripe
   session (24h) and only create harmless DB clutter. */
export async function createPendingRegistration(params: {
    contactName: string
    contactEmail: string
    eventId: string
    selfTierId: string
    selfBirthDate?: string
    selfShirtSize?: string
    additionalMembers: MemberInput[]
    successUrl: (token: string) => string
    cancelUrl: (token: string) => string
}): Promise<{ registrationId: string; managementToken: string; checkoutUrl: string }> {
    const allTierIds = [params.selfTierId, ...params.additionalMembers.map((m) => m.tierId)]
    const tierMap = await fetchAndValidateTiers(params.eventId, allTierIds)
    const selfTier = tierMap.get(params.selfTierId)!

    const { lineItems } = calculateTotal(
        params.contactName,
        selfTier,
        params.additionalMembers,
        tierMap,
    )

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            eventId: params.eventId,
            status: 'pending',
        })
        .returning()

    const selfParsed = params.selfBirthDate ? parseBirthDate(params.selfBirthDate) : null
    await db.insert(partyMembers).values([
        {
            registrationId: registration.id,
            name: params.contactName,
            birthYear: selfParsed?.birthYear ?? null,
            birthMonth: selfParsed?.birthMonth ?? null,
            birthDay: selfParsed?.birthDay ?? null,
            shirtSize: params.selfShirtSize || null,
            tierLabel: selfTier.label,
            priceCents: selfTier.priceCents,
        },
        ...params.additionalMembers.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            const tier = tierMap.get(m.tierId)!
            return {
                registrationId: registration.id,
                name: m.name,
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                tierLabel: tier.label,
                priceCents: tier.priceCents,
            }
        }),
    ])

    dbg.register(
        'registration created id=%s email=%s, creating stripe session',
        registration.id,
        params.contactEmail,
    )

    const { url: checkoutUrl, sessionId } = await createRegistrationCheckout({
        lineItems,
        registrationId: registration.id,
        managementToken,
        customerEmail: params.contactEmail,
        successUrl: () => params.successUrl(managementToken),
        cancelUrl: () => params.cancelUrl(managementToken),
    })

    await db
        .update(registrations)
        .set({ stripeSessionId: sessionId })
        .where(eq(registrations.id, registration.id))

    dbg.register('stripe session=%s created', sessionId)
    return { registrationId: registration.id, managementToken, checkoutUrl }
}
