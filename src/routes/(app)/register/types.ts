/* Shared domain types for the /register route */

/* Mailing address fields, shared by FormMember and the "same as contact" copy source */
export type Address = {
    addressLine1: string
    addressLine2?: string
    addressCity: string
    addressState: string
    addressZip: string
}

/* Member being built in the new-registration form before submission */
export type FormMember = {
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
    vegetarianMeal: 'yes' | 'no' | ''
    attendedReunion2025: 'yes' | 'no' | ''
} & Address

/* Every field collected about a person besides their name (tier, birthday, shirt, address,
   extra questions) — grouped into one object so components binding all of it (YourInformationCard)
   take a single prop instead of growing a bindable prop per field. */
export type PersonDetails = Omit<FormMember, 'name'>

/* Full party member row returned from the DB (used in RegistrationManager and EditMemberDialog) */
export type PartyMember = {
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
}

/* The subset of PartyMember needed to edit a member's details */
export type EditableMember = Pick<
    PartyMember,
    | 'id'
    | 'name'
    | 'birthYear'
    | 'birthMonth'
    | 'birthDay'
    | 'shirtSize'
    | 'vegetarianMeal'
    | 'tierLabel'
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
    stripeSessionId: string | null
}

/* Reunion event fields needed by the registration UI */
export type EventDetails = {
    id: string
    title: string
    shirtsEnabled: boolean
    registrationLockDate: Date | null
}

/* Tier available for selection on an event */
export type TierOption = {
    id: string
    label: string
    priceCents: number
    shirtSizeCategory: 'adult' | 'child'
}

/* Contact's own address, threaded down so additional members can copy it via "same as" */
export type ContactAddress = Address
