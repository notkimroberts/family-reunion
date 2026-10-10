// Name and price data needed to construct a Stripe line item
export type LineItemInput = {
    name: string
    priceCents: number
}

// Params for createRegistrationCheckout
export type RegistrationCheckoutParams = {
    lineItems: LineItemInput[]
    registrationId: string
    /* Plaintext view token; embedded in Stripe metadata so the webhook can build the view URL. The DB only stores the hash. */
    viewToken: string
    /* Set when a gift shares this checkout, so the webhook can mark that donation paid too. */
    donationId?: string
    /* Names the payment in the Stripe dashboard and on any Stripe receipt, e.g. "Reunion 2027
       registration". The Checkout session's own metadata is not shown on either. */
    description: string
    customerEmail?: string
    /* Caller closes over whatever it wants in these — typically the plaintext viewToken. */
    successUrl: () => string
    cancelUrl: () => string
}

// Return value of createRegistrationCheckout
export type RegistrationCheckoutResult = {
    url: string
    sessionId: string
}

// Params for createDonationCheckout
export type DonationCheckoutParams = {
    donationId: string
    /* What the line item is called on the Stripe page, e.g. "Donation to the 2026 reunion". */
    name: string
    amountCents: number
    customerEmail?: string
    successUrl: () => string
    cancelUrl: () => string
}
