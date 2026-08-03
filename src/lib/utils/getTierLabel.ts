export function getTierLabel(tierId: string, tiers: { id: string; label: string }[]): string {
    return tiers.find((t) => t.id === tierId)?.label ?? ''
}
