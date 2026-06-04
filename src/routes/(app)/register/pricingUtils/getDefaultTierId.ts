import { getAge } from '$lib/utils/age'
import type { PricingTier } from './PricingTier'

// Finds the first tier whose age range contains the age derived from birthYear; returns '' if no match or no birthYear
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
