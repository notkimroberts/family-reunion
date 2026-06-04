/* Shared domain types for the /register route */

/* Member being built in the new-registration form before submission */
export type FormMember = {
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
}

/* Full party member row returned from the DB (used in RegistrationManager and EditMemberDialog) */
export type PartyMember = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    tierLabel: string
    priceCents: number
}

/* The subset of PartyMember needed to edit a member's details */
export type EditableMember = Pick<
    PartyMember,
    'id' | 'name' | 'birthYear' | 'birthMonth' | 'birthDay' | 'shirtSize' | 'tierLabel'
>

/* Member entry in the remove-member confirmation dialog */
export type RemovableMember = {
    id: string
    name: string
    priceCents: number
}

/* Registration row summary displayed in RegistrationManager */
export type RegistrationDetails = {
    id: string
    status: string
    totalAmountCents: number
    stripeSessionId: string | null
}

/* Reunion event fields needed by the registration UI */
export type EventDetails = {
    id: string
    title: string
    shirtsEnabled: boolean
}

/* Pricing tier with age bounds — used in RegistrationManager and AddMemberForm */
export type RegistrationPricingTier = {
    id: string
    label: string
    priceCents: number
    minAge: number
    maxAge: number | null
}

/* Minimal tier shape used in MemberFormFields (no age bounds needed) */
export type MemberFormTier = {
    id: string
    label: string
    priceCents: number
}
