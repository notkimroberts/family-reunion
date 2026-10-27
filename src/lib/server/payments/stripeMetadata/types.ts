// Stripe session metadata for an initial full registration checkout
export type RegistrationSessionMetadata = {
    type: 'registration'
    registrationId: string
    /* Plaintext view token. The DB stores only the hash; this is the channel that carries the plaintext to the webhook so the confirmation email can include a working view URL. */
    viewToken: string
    /* Set when the registrant added a gift to the same checkout, so the webhook can mark that
       donation paid off the one session. Optional: absent on every session created before
       donations existed, and on any registration without a gift. */
    donationId?: string
}

// Stripe session metadata for a standalone donation made at /donate
export type DonationSessionMetadata = {
    type: 'donation'
    donationId: string
}

// Stripe session metadata for an add-member checkout; all numeric fields are stored as strings per Stripe's metadata spec
export type AddMemberSessionMetadata = {
    type: 'add_member'
    registrationId: string
    memberName: string
    memberTierId: string
    memberTierLabel: string
    memberBirthDate: string
    memberShirtSize: string
    memberAddressLine1: string
    memberAddressLine2: string
    memberAddressCity: string
    memberAddressState: string
    memberAddressZip: string
    /* '', 'true', or 'false' — '' means the question wasn't answered (tri-state, mirrors the nullable DB column) */
    memberVegetarianMeal: string
    memberAttendedReunion2025: string
    memberPriceCents: string
}

// One owed place on a member-payment checkout, and the gross charged for it
export type MemberCharge = {
    memberId: string
    grossCents: number
}

// Stripe session metadata for a card payment of the places still owed on a paid booking
export type MemberPaymentSessionMetadata = {
    type: 'member_payment'
    registrationId: string
    /* Plaintext view token, so the webhook can link the confirmation email, as on a registration. */
    viewToken: string
    /* Which members this charge paid for and what each was charged. The webhook records that gross as
       the member's price, so a later cancellation refunds what the card actually paid. */
    charges: MemberCharge[]
}

// Discriminated union of all known Stripe session metadata shapes, keyed by `type`
export type StripeSessionMetadata =
    | RegistrationSessionMetadata
    | AddMemberSessionMetadata
    | DonationSessionMetadata
    | MemberPaymentSessionMetadata

// Params for encodeAddMemberMetadata
export type AddMemberMetadataParams = {
    registrationId: string
    memberName: string
    memberTierId: string
    memberTierLabel: string
    memberBirthDate?: string
    memberShirtSize?: string
    memberAddressLine1?: string
    memberAddressLine2?: string
    memberAddressCity?: string
    memberAddressState?: string
    memberAddressZip?: string
    memberVegetarianMeal?: boolean
    memberAttendedReunion2025?: boolean
    memberPriceCents: number
}
