import type { TierPricing } from '$lib/server/tiers'
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
    selfPricing: TierPricing,
    additionalMembers: MemberInput[],
    pricingByTierId: Record<string, TierPricing>,
): {
    netCents: number
    feeCents: number
    totalCents: number
    lineItems: CalculatedLineItem[]
} {
    const allMembers = [
        { name: selfName, pricing: selfPricing },
        ...additionalMembers.map((m) => ({ name: m.name, pricing: pricingByTierId[m.tierId] })),
    ]
    const lineItems: CalculatedLineItem[] = allMembers.map((m) => ({
        name: `${m.name} (${m.pricing.label})`,
        netCents: m.pricing.priceCents,
        grossCents: grossUpForStripe(m.pricing.priceCents),
    }))
    const netCents = lineItems.reduce((sum, item) => sum + item.netCents, 0)
    const totalCents = lineItems.reduce((sum, item) => sum + item.grossCents, 0)
    return { netCents, feeCents: totalCents - netCents, totalCents, lineItems }
}
