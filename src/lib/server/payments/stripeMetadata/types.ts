// Stripe session metadata for an initial full registration checkout
export type RegistrationSessionMetadata = {
    type: 'registration'
    registrationId: string
    /* Plaintext management token. The DB stores only the hash; this is the channel that carries the plaintext to the webhook so the confirmation email can include a working management URL. */
    managementToken: string
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

// Discriminated union of all known Stripe session metadata shapes, keyed by `type`
export type StripeSessionMetadata = RegistrationSessionMetadata | AddMemberSessionMetadata

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
