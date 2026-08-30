import type { MemberInput } from '$lib/server/registrations'
import { parseYesNo } from '$lib/utils'
import type { PersonDetailsData, MemberData } from './schema'
import { toMemberInputs } from './toMemberInputs'

export type RegistrationIntake = {
    contactName: string
    contactEmail: string
    contactPhone: string | undefined
    /* The contact first, then their guests. Both create paths flag index 0 as the contact. */
    members: MemberInput[]
}

/* Turns a validated registration form into the shape the create services take.

   Two routes post this form — the public register page and admin paper entry — and both were doing
   the same three things by hand: joining the two name fields, lowercasing the email, and mapping
   the contact's own `self` fields into a MemberInput one property at a time. The name join and the
   lowercase were character-for-character identical in both files, and the `self` mapping was a
   third copy of what toMemberInputs already does for everyone else in the party.

   NORMALISATION LIVES HERE, NOT IN THE SCHEMA. The schemas are shared with client-side validation,
   where a zod transform would rewrite what someone is halfway through typing. Lowercasing is not
   cosmetic: /register/recover finds a booking by exact contact email, so a capitalised address
   stored as typed is a registrant who cannot recover their own link. */
export function toRegistrationIntake(form: {
    contactFirstName: string
    contactLastName: string
    contactEmail: string
    contactPhone: string
    self: PersonDetailsData
    members: MemberData[]
}): RegistrationIntake {
    const contactName = `${form.contactFirstName.trim()} ${form.contactLastName.trim()}`.trim()

    return {
        contactName,
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone || undefined,
        members: [
            /* The contact is an attendee too — the form makes them pick their own tier. */
            {
                name: contactName,
                tierId: form.self.tierId,
                birthDate: form.self.birthDate || undefined,
                shirtSize: form.self.shirtSize || undefined,
                addressLine1: form.self.addressLine1,
                addressLine2: form.self.addressLine2,
                addressCity: form.self.addressCity,
                addressState: form.self.addressState,
                addressZip: form.self.addressZip,
                vegetarianMeal: parseYesNo(form.self.vegetarianMeal),
                attendedReunion2025: parseYesNo(form.self.attendedReunion2025),
            },
            ...toMemberInputs(form.members),
        ],
    }
}
