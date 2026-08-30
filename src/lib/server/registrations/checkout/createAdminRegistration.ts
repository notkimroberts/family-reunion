import { db } from '$lib/server/db'
import { partyMembers, registrations, registrationStatusEnum } from '$lib/server/db/schema'
import { resolveTierPricing } from '$lib/server/tiers'
import { generateManagementToken } from '../hashManagementToken'
import type { MemberInput } from './MemberInput'
import { buildPartyMemberRow } from './buildPartyMemberRow'

/* Inserts a registration directly at the given status (bypasses Stripe). Generates a managementToken so the contact can self-manage later; the DB stores only the SHA-256 hash, the plaintext is returned to the caller. */
export async function createAdminRegistration(params: {
    eventId: string
    contactName: string
    contactEmail: string
    contactPhone?: string
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: MemberInput[]
}): Promise<{ registrationId: string; managementToken: string }> {
    const pricingByTierId = await resolveTierPricing(
        params.eventId,
        params.members.map((m) => m.tierId),
    )

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            eventId: params.eventId,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            contactPhone: params.contactPhone || null,
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

    return { registrationId: registration.id, managementToken }
}
