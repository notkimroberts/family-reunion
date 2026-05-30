import { getAge } from '$lib/utils/age'
import type { PricingTier } from './PricingTier'

export function getDefaultTierId(
    tiers: PricingTier[],
    birthYear: number | null | undefined,
): string {
    if (!birthYear) {
        return ''
    }
    const age = getAge(birthYear)
    return tiers.find((t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge))?.id ?? ''
}
