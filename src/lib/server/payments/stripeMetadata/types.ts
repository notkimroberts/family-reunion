// Stripe session metadata for an initial full registration checkout
export type RegistrationSessionMetadata = {
    type: 'registration'
    registrationId: string
}

// Stripe session metadata for an add-member checkout; all numeric fields are stored as strings per Stripe's metadata spec
export type AddMemberSessionMetadata = {
    type: 'add_member'
    registrationId: string
    memberName: string
    memberTierId: string
    memberBirthDate: string
    memberShirtSize: string
    memberPriceCents: string
}

// Discriminated union of all known Stripe session metadata shapes, keyed by `type`
export type StripeSessionMetadata = RegistrationSessionMetadata | AddMemberSessionMetadata

// Params for encodeAddMemberMetadata
export type AddMemberMetadataParams = {
    registrationId: string
    memberName: string
    memberTierId: string
    memberBirthDate?: string
    memberShirtSize?: string
    memberPriceCents: number
}
