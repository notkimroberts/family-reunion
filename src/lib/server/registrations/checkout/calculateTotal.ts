import type { PricingTier } from '$lib/server/db/schema'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import type { MemberInput } from './MemberInput'

export type CalculatedLineItem = {
    name: string
    netCents: number
    grossCents: number
}

/* Computes per-member line items grossed-up for Stripe's fee, plus net/fee/total summary.
   Tier prices in the DB are "what we want to net" — the gross-up happens here so the org
   receives the intended net after Stripe's 2.9% + 30¢. */
export function calculateTotal(
    selfName: string,
    selfTier: PricingTier,
    additionalMembers: MemberInput[],
    tierMap: Map<string, PricingTier>,
): {
    netCents: number
    feeCents: number
    totalCents: number
    lineItems: CalculatedLineItem[]
} {
    const allMembers = [
        { name: selfName, tier: selfTier },
        ...additionalMembers.map((m) => ({ name: m.name, tier: tierMap.get(m.tierId)! })),
    ]
    const lineItems: CalculatedLineItem[] = allMembers.map((m) => ({
        name: `${m.name} (${m.tier.label})`,
        netCents: m.tier.priceCents,
        grossCents: grossUpForStripe(m.tier.priceCents),
    }))
    const netCents = lineItems.reduce((sum, item) => sum + item.netCents, 0)
    const totalCents = lineItems.reduce((sum, item) => sum + item.grossCents, 0)
    return { netCents, feeCents: totalCents - netCents, totalCents, lineItems }
}
