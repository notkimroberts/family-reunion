export type RegistrationSessionMetadata = {
    type: 'registration'
    registrationId: string
}

export type AddMemberSessionMetadata = {
    type: 'add_member'
    registrationId: string
    memberName: string
    memberTierId: string
    memberBirthDate: string
    memberShirtSize: string
    memberPriceCents: string
}

export type StripeSessionMetadata = RegistrationSessionMetadata | AddMemberSessionMetadata
