// Name and price data needed to construct a Stripe line item
export type LineItemInput = {
    name: string
    priceCents: number
}

// Params for createRegistrationCheckout
export type RegistrationCheckoutParams = {
    lineItems: LineItemInput[]
    registrationId: string
    /* Plaintext management token; embedded in Stripe metadata so the webhook can build the manage URL. The DB only stores the hash. */
    managementToken: string
    customerEmail?: string
    /* Caller closes over whatever it wants in these — typically the plaintext managementToken. */
    successUrl: () => string
    cancelUrl: () => string
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
