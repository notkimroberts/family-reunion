/* One party member as the edit form holds it while being edited.

   Separate from RegistrationMember (the database shape) because the form needs two things the row
   itself does not carry: the tier it rendered with, and its own editing state. */
export type MemberRow = {
    memberId: string
    name: string
    tierId: string
    /* The tier this row rendered with, so a save can tell a deliberate change from an untouched select.
       party_members has no tier_id, so tierId is matched by label and may be ''. */
    initialTierId: string
    birthDate: string | undefined
    shirtSize: string
    vegetarianMeal: 'yes' | 'no' | ''
    attendedReunion2025: 'yes' | 'no' | ''
    priceCents: number
    /* The contact's own attendee row. Their name is edited once, in the Contact card. */
    isContact: boolean
}
