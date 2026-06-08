import type { PricingTier } from '$lib/server/db/schema'
import type { MemberInput } from './MemberInput'

/* Computes line items and total for a registration party. */
export function calculateTotal(
    selfName: string,
    selfTier: PricingTier,
    additionalMembers: MemberInput[],
    tierMap: Map<string, PricingTier>,
): { totalCents: number; lineItems: Array<{ name: string; priceCents: number }> } {
    const allMembers = [
        { name: selfName, tier: selfTier },
        ...additionalMembers.map((m) => ({ name: m.name, tier: tierMap.get(m.tierId)! })),
    ]
    const lineItems = allMembers.map((m) => ({
        name: `${m.name} (${m.tier.label})`,
        priceCents: m.tier.priceCents,
    }))
    const totalCents = lineItems.reduce((sum, item) => sum + item.priceCents, 0)
    return { totalCents, lineItems }
}
