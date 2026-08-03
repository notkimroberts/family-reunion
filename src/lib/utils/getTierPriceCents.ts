export function getTierPriceCents(
    tierId: string,
    tiers: { id: string; priceCents: number }[],
): number {
    return tiers.find((t) => t.id === tierId)?.priceCents ?? 0
}
