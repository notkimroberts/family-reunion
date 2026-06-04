import { formatPrice } from '$lib/utils'
import type { PricingTier } from './PricingTier'

// Returns the formatted price string for a tier; falls back to '0.00' if tier is not found
export function getTierPrice(tierMap: Map<string, PricingTier>, tierId: string): string {
    const tier = tierMap.get(tierId)
    return tier ? formatPrice(tier.priceCents) : '0.00'
}
