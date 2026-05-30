import type { PricingTier } from './PricingTier'

export function getTierLabel(tierMap: Map<string, PricingTier>, tierId: string): string {
    return tierMap.get(tierId)?.label ?? ''
}
