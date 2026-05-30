import { formatPrice } from '$lib/utils'
import { getAge, parseBirthDate } from '$lib/utils/age'

type Tier = { id: string; label: string; priceCents: number; minAge: number; maxAge: number | null }

export function getDefaultTierId(tiers: Tier[], birthYear: number | null | undefined): string {
    if (!birthYear) {
        return ''
    }
    const age = getAge(birthYear)
    return tiers.find((t) => age >= t.minAge && (t.maxAge === null || age <= t.maxAge))?.id ?? ''
}

export function getTierLabel(tierMap: Map<string, Tier>, tierId: string): string {
    return tierMap.get(tierId)?.label ?? ''
}

export function getTierPrice(tierMap: Map<string, Tier>, tierId: string): string {
    const tier = tierMap.get(tierId)
    return tier ? formatPrice(tier.priceCents) : '0.00'
}

export function getMemberAge(birthDate: string | undefined): number | null {
    if (!birthDate) {
        return null
    }
    const parsed = parseBirthDate(birthDate)
    return parsed ? getAge(parsed.birthYear, parsed.birthMonth, parsed.birthDay) : null
}
