import { formatPrice } from '$lib/utils'
import type { PricingTier } from './PricingTier'

export function getTierPrice(tierMap: Map<string, PricingTier>, tierId: string): string {
    const tier = tierMap.get(tierId)
    return tier ? formatPrice(tier.priceCents) : '0.00'
}
