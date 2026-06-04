import type { PricingTier } from './PricingTier'

// Returns the display label for a tier; falls back to empty string if tier is not found
export function getTierLabel(tierMap: Map<string, PricingTier>, tierId: string): string {
    return tierMap.get(tierId)?.label ?? ''
}
