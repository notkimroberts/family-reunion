import { eq } from 'drizzle-orm'
import type { HotelStayAnswer } from '$lib/general/constants'
import { db } from '$lib/server/db'
import { donations, partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createRegistrationCheckout } from '$lib/server/payments'
import { resolveTierPricing } from '$lib/server/tiers'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { getRegistrationLockDate } from '../getRegistrationLockDate'
import { generateManagementToken } from '../hashManagementToken'
import type { MemberInput } from './MemberInput'
import { assertContactTierIsAdult } from './_assertContactTierIsAdult'
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
    /* Whether this party plans to stay at the host hotel, for the room block. Booking-level. */
    stayingAtHostHotel?: HotelStayAnswer
    eventId: string
    /* The contact first, then their guests — the same shape createAdminRegistration takes. It used
       to be eleven `self*` parameters beside an `additionalMembers` array, which made the contact's
       own details a third spelling of MemberInput and meant the caller mapped them by hand. */
    members: MemberInput[]
    /* An optional gift added to the same checkout, charged at exactly this amount — gifts are not
       grossed up the way tier prices are. Zero and undefined both mean no gift. */
    donationCents?: number
    successUrl: (token: string) => string
    cancelUrl: (token: string) => string
}): Promise<{ registrationId: string; managementToken: string; checkoutUrl: string }> {
    /* Freeze new registrations once the lock date passes, not just changes to existing ones.
       Without this the add/edit/remove/cancel paths are closed while the front door stays
       open, so a late registrant can still pay for a place nobody is catering for.
       Admin paper entry deliberately skips this check — see admin/registrations. */
    assertRegistrationEditable(await getRegistrationLockDate(params.eventId))

    const pricingByTierId = await resolveTierPricing(
        params.eventId,
        params.members.map((member) => member.tierId),
    )

    assertContactTierIsAdult(params.members, pricingByTierId)

    const lineItems = buildCheckoutLineItems(params.members, pricingByTierId)

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            contactPhone: params.contactPhone || null,
            stayingAtHostHotel: params.stayingAtHostHotel ?? null,
            eventId: params.eventId,
            status: 'pending',
        })
        .returning()

    await db.insert(partyMembers).values(
        params.members.map((member, index) => {
            const pricing = pricingByTierId[member.tierId]
            return buildPartyMemberRow({
                registrationId: registration.id,
                member,
                tierLabel: pricing.label,
                /* Snapshot the GROSS — what the card is charged. Refund maths reads this directly. */
                priceCents: grossUpForStripe(pricing.priceCents),
                /* Index 0 is the contact attending their own reunion, flagged so their name has one
                   editable field rather than two copies that drift — see party_members.isContact. */
                isContact: index === 0,
            })
        }),
    )

    dbg.register(
        'registration created id=%s email=%s, creating stripe session',
        registration.id,
        params.contactEmail,
    )

    /* A gift is its own row from the start, pending like the registration, so an abandoned checkout
       leaves the two consistent. The donor is the contact — the register form asks for no second
       name — and the row carries registrationId, which is what tells the admin list this gift
       arrived with a booking rather than on its own. */
    const donationCents = params.donationCents ?? 0
    let donationId: string | undefined
    if (donationCents > 0) {
        const [donation] = await db
            .insert(donations)
            .values({
                eventId: params.eventId,
                registrationId: registration.id,
                donorName: params.contactName,
                donorEmail: params.contactEmail,
                amountCents: donationCents,
                status: 'pending',
            })
            .returning({ id: donations.id })
        donationId = donation.id
        dbg.register('gift of %d added to registration %s', donationCents, registration.id)
    }

    const { url: checkoutUrl, sessionId } = await createRegistrationCheckout({
        lineItems: [
            ...lineItems.map((item) => ({ name: item.name, priceCents: item.grossCents })),
            /* Charged at face value, NOT grossed up: a gift is whatever the giver chose to give. */
            ...(donationCents > 0
                ? [{ name: 'Gift to the reunion', priceCents: donationCents }]
                : []),
        ],
        registrationId: registration.id,
        managementToken,
        donationId,
        customerEmail: params.contactEmail,
        successUrl: () => params.successUrl(managementToken),
        cancelUrl: () => params.cancelUrl(managementToken),
    })

    await db
        .update(registrations)
        .set({ stripeSessionId: sessionId })
        .where(eq(registrations.id, registration.id))

    if (donationId) {
        await db
            .update(donations)
            .set({ stripeSessionId: sessionId, updatedAt: new Date() })
            .where(eq(donations.id, donationId))
    }

    dbg.register('stripe session=%s created', sessionId)
    return { registrationId: registration.id, managementToken, checkoutUrl }
}
