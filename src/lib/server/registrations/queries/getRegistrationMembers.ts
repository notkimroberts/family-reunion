import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, pricingTiers } from '$lib/server/db/schema'
import type { RegistrationMember } from './RegistrationMember'

// Joins party_members with pricing_tiers to include tier label and price alongside each member's personal details.
export async function getRegistrationMembers(
    registrationId: string,
): Promise<RegistrationMember[]> {
    return db
        .select({
            id: partyMembers.id,
            name: partyMembers.name,
            birthYear: partyMembers.birthYear,
            birthMonth: partyMembers.birthMonth,
            birthDay: partyMembers.birthDay,
            shirtSize: partyMembers.shirtSize,
            pricingTierId: partyMembers.pricingTierId,
            stripePaymentIntentId: partyMembers.stripePaymentIntentId,
            tierLabel: pricingTiers.label,
            priceCents: pricingTiers.priceCents,
        })
        .from(partyMembers)
        .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
        .where(eq(partyMembers.registrationId, registrationId))
}
