export type RegistrationMember = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    pricingTierId: string
    stripePaymentIntentId: string | null
    tierLabel: string
    priceCents: number
}
