// Name and price data needed to construct a Stripe line item
export type LineItemInput = {
    name: string
    priceCents: number
}

// Params for createRegistrationCheckout
export type RegistrationCheckoutParams = {
    lineItems: LineItemInput[]
    registrationId: string
    successUrl: (id: string) => string
    cancelUrl: (id: string) => string
}

// Return value of createRegistrationCheckout
export type RegistrationCheckoutResult = {
    url: string
    sessionId: string
}

// Params for createAddMemberCheckout
export type AddMemberCheckoutParams = {
    name: string
    tierLabel: string
    priceCents: number
    registrationId: string
    memberTierId: string
    memberBirthDate?: string
    memberShirtSize?: string
    successUrl: string
    cancelUrl: string
}
