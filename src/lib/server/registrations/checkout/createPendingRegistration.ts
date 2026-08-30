import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createRegistrationCheckout } from '$lib/server/payments'
import { resolveTierPricing } from '$lib/server/tiers'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { getRegistrationLockDate } from '../getRegistrationLockDate'
import { generateManagementToken } from '../hashManagementToken'
import type { MemberInput } from './MemberInput'
import { buildCheckoutLineItems } from './buildCheckoutLineItems'
import { buildPartyMemberRow } from './buildPartyMemberRow'

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
    contactPhone?: string
    eventId: string
    selfTierId: string
    selfBirthDate?: string
    selfShirtSize?: string
    selfAddressLine1?: string
    selfAddressLine2?: string
    selfAddressCity?: string
    selfAddressState?: string
    selfAddressZip?: string
    selfVegetarianMeal?: boolean
    selfAttendedReunion2025?: boolean
    additionalMembers: MemberInput[]
    successUrl: (token: string) => string
    cancelUrl: (token: string) => string
}): Promise<{ registrationId: string; managementToken: string; checkoutUrl: string }> {
    /* Freeze new registrations once the lock date passes, not just changes to existing ones.
       Without this the add/edit/remove/cancel paths are closed while the front door stays
       open, so a late registrant can still pay for a place nobody is catering for.
       Admin paper entry deliberately skips this check — see admin/registrations. */
    assertRegistrationEditable(await getRegistrationLockDate(params.eventId))

    const allTierIds = [params.selfTierId, ...params.additionalMembers.map((m) => m.tierId)]
    const pricingByTierId = await resolveTierPricing(params.eventId, allTierIds)
    const selfPricing = pricingByTierId[params.selfTierId]

    const lineItems = buildCheckoutLineItems(
        params.contactName,
        selfPricing,
        params.additionalMembers,
        pricingByTierId,
    )

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            contactPhone: params.contactPhone || null,
            eventId: params.eventId,
            status: 'pending',
        })
        .returning()

    await db.insert(partyMembers).values([
        buildPartyMemberRow({
            registrationId: registration.id,
            member: {
                name: params.contactName,
                birthDate: params.selfBirthDate,
                shirtSize: params.selfShirtSize,
                addressLine1: params.selfAddressLine1,
                addressLine2: params.selfAddressLine2,
                addressCity: params.selfAddressCity,
                addressState: params.selfAddressState,
                addressZip: params.selfAddressZip,
                vegetarianMeal: params.selfVegetarianMeal,
                attendedReunion2025: params.selfAttendedReunion2025,
            },
            tierLabel: selfPricing.label,
            /* Snapshot the gross — what the customer is being charged. Refund math reads this directly. */
            priceCents: grossUpForStripe(selfPricing.priceCents),
            /* This row is the contact attending their own reunion. Flagged so their name has one
               editable field rather than two copies that drift — see party_members.isContact. */
            isContact: true,
        }),
        ...params.additionalMembers.map((member) => {
            const pricing = pricingByTierId[member.tierId]
            return buildPartyMemberRow({
                registrationId: registration.id,
                member,
                tierLabel: pricing.label,
                priceCents: grossUpForStripe(pricing.priceCents),
            })
        }),
    ])

    dbg.register(
        'registration created id=%s email=%s, creating stripe session',
        registration.id,
        params.contactEmail,
    )

    const { url: checkoutUrl, sessionId } = await createRegistrationCheckout({
        lineItems: lineItems.map((item) => ({ name: item.name, priceCents: item.grossCents })),
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
