import type { MemberInput } from './MemberInput'

type Tier = { label: string; priceCents: number }

export function calculateTotal(
    selfName: string,
    selfTier: Tier,
    additionalMembers: MemberInput[],
    tierMap: Map<string, Tier>,
): { totalCents: number; lineItems: Array<{ name: string; priceCents: number }> } {
    const lineItems = [{ name: `${selfName} (${selfTier.label})`, priceCents: selfTier.priceCents }]
    let totalCents = selfTier.priceCents
    for (const m of additionalMembers) {
        const tier = tierMap.get(m.tierId)!
        totalCents += tier.priceCents
        lineItems.push({ name: `${m.name} (${tier.label})`, priceCents: tier.priceCents })
    }
    return { totalCents, lineItems }
}
