import type { RegistrationCategory } from '$lib/types/registrationCategory'

export function getCategoryPriceCents(
    category: RegistrationCategory,
    prices: { adultPriceCents: number; childPriceCents: number },
): number {
    return category === 'adult' ? prices.adultPriceCents : prices.childPriceCents
}
