import type { MemberInputData } from './schema'

/* Shared domain types for the /register route */

/* Mailing address fields, shared by FormMember and the "same as contact" copy source */
export type Address = {
    addressLine1: string
    addressLine2?: string
    addressCity: string
    addressState: string
    addressZip: string
}

/* Member being built in the form before submission.

   The schema's INPUT type, not its output: a freshly added person has not answered the yes/no
   questions yet, so those are still ''. Deriving it rather than restating the shape means the UI
   and the server validation cannot drift — and validation is precisely what converts this into
   MemberData. */
export type FormMember = MemberInputData

/* Every field collected about a person besides their name (tier, birthday, shirt, address, extra
   questions) — one object so components binding all of it take a single prop rather than a
   bindable prop per field, and so $form can hold it as a single nested value. */
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
    registrationLockDate: Date | null
}

/* Tier available for selection on an event. Label and price only — the tiers table used to carry an
   adult/child shirt-size flag that nothing rendering a size list ever read. */
export type TierOption = {
    id: string
    label: string
    priceCents: number
}

/* Contact's own address, threaded down so additional members can copy it via "same as" */
export type ContactAddress = Address
