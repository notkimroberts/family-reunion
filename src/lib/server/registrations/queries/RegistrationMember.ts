export type RegistrationMember = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    addressLine1: string | null
    addressLine2: string | null
    addressCity: string | null
    addressState: string | null
    addressZip: string | null
    vegetarianMeal: boolean | null
    attendedReunion2025: boolean | null
    tierLabel: string
    priceCents: number
    stripePaymentIntentId: string | null
    /* Set only by the add-member checkout, so it is the one signal that identifies a member who paid
       for their own place separately — see getMemberPaymentOrigin. */
    stripeCheckoutSessionId: string | null
    /* True for the registration's contact. Their name is written from registrations.contactName, so the
       admin form shows it read-only — see party_members.isContact. */
    isContact: boolean
}
