export type PricingTier = {
    id: string
    label: string
    priceCents: number
    minAge: number
    maxAge: number | null
}
