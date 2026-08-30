import { z } from 'zod'
import { memberSchema } from '../../../../../register/schema'

/* One member's editable fields.

   vegetarianMeal/attendedReunion2025 admit '' for the same reason personDetailsSchema does: the form
   holds them as strings and an unanswered value has to be representable. Unlike the public form they
   are NOT required here — an organiser correcting a birthday must not be forced to invent a dietary
   answer for a member who never gave one. */
export const adminEditMemberSchema = z.object({
    memberId: z.string().min(1),
    name: z.string().trim().min(2, 'Please enter a name'),
    /* OPTIONAL, and the form omits it unless the organiser actually changed the tier.

       party_members stores only the denormalised tierLabel and priceCents — there is no tier_id
       column — so the member's tier can only be guessed by matching the label against the event's
       current tiers, and a renamed tier breaks that match. Posting a guessed id on every save would
       silently move a member onto whatever tier the select happened to land on. Sending it only on a
       deliberate change means a failed match leaves the tier untouched. */
    tierId: z.string().optional(),
    birthDate: z.string().optional(),
    /* Required here too. Members recorded before shirts were collected have none, so correcting any
       other field on them now asks for a size — which is the point: that is how the gaps get filled. */
    shirtSize: z.string().min(1, 'Please choose a T-shirt size'),
    vegetarianMeal: z.enum(['yes', 'no', '']),
    attendedReunion2025: z.enum(['yes', 'no', '']),
})

/* One save covers everything an organiser can change: contact, status, and every existing member.

   Batched deliberately. Each save that matters to the registrant rotates their management token and
   emails them, so four separate actions would mean four rotations and four emails for one sitting's
   work. */
export const adminEditRegistrationSchema = z.object({
    contactName: z.string().trim().min(2, 'Please enter a contact name'),
    contactEmail: z.email('Please enter a valid email'),
    contactPhone: z.string().optional(),
    status: z.enum(['pending', 'paid', 'waived'], 'Please choose a status'),
    members: z.array(adminEditMemberSchema),
    /* People staged for addition during this sitting.

       memberSchema is the PUBLIC form's member shape, reused deliberately: an organiser adding someone
       must not be held to a weaker standard than a registrant adding the same person, or catering and
       shirt counts end up complete only for people who registered themselves. */
    newMembers: z.array(memberSchema),
    /* Ids removed during this sitting. Collected rather than acted on immediately, so the whole edit
       stays one save the registrant hears about once. */
    removedMemberIds: z.array(z.string()),
})
