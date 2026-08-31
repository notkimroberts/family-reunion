import type { HotelStayAnswer } from '$lib/general/constants'
import { db } from '$lib/server/db'
import {
    donations,
    partyMembers,
    registrationStatusEnum,
    registrations,
} from '$lib/server/db/schema'
import { resolveTierPricing } from '$lib/server/tiers'
import { generateManagementToken } from '../hashManagementToken'
import type { MemberInput } from './MemberInput'
import { assertContactTierIsAdult } from './_assertContactTierIsAdult'
import { buildPartyMemberRow } from './buildPartyMemberRow'

/* Inserts a registration directly at the given status (bypasses Stripe). Generates a managementToken so the contact can self-manage later; the DB stores only the SHA-256 hash, the plaintext is returned to the caller. */
export async function createAdminRegistration(params: {
    eventId: string
    contactName: string
    contactEmail: string
    contactPhone?: string
    /* Booking-level, for the room block. */
    stayingAtHostHotel?: HotelStayAnswer
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: MemberInput[]
    /* A gift that came with the paper form or the cheque. Zero and undefined both mean none. */
    donationCents?: number
}): Promise<{ registrationId: string; managementToken: string }> {
    const pricingByTierId = await resolveTierPricing(
        params.eventId,
        params.members.map((m) => m.tierId),
    )

    assertContactTierIsAdult(params.members, pricingByTierId)

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            eventId: params.eventId,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            contactPhone: params.contactPhone || null,
            stayingAtHostHotel: params.stayingAtHostHotel ?? null,
            status: params.status,
        })
        .returning()

    await db.insert(partyMembers).values(
        params.members.map((member, index) => {
            const pricing = pricingByTierId[member.tierId]
            return buildPartyMemberRow({
                registrationId: registration.id,
                member,
                tierLabel: pricing.label,
                priceCents: pricing.priceCents,
                /* The caller puts the contact first — see admin/registrations/new. Flagged so their
                   name has a single editable field; see party_members.isContact. */
                isContact: index === 0,
            })
        }),
    )

    /* No Stripe here, so the gift's state follows the registration's: money an organiser has in
       hand is paid, and a booking still awaiting a cheque carries a gift still awaiting it too. A
       waived registration cannot have brought money with it, so its gift is recorded as pending
       rather than silently claimed as received.

       stripeFeeCents stays null and means what it always means: not known. Cash and cheques lose
       nothing to Stripe, and the admin totals only ever apply a fee to card money. */
    if (params.donationCents && params.donationCents > 0) {
        await db.insert(donations).values({
            eventId: params.eventId,
            registrationId: registration.id,
            donorName: params.contactName,
            donorEmail: params.contactEmail,
            amountCents: params.donationCents,
            status: params.status === 'paid' ? 'paid' : 'pending',
            paidAt: params.status === 'paid' ? new Date() : null,
        })
    }

    return { registrationId: registration.id, managementToken }
}
