import { z } from 'zod'
import { personDetailsSchema } from '../../../register/schema'

/* Offline add-member. Reuses personDetailsSchema so an admin addition is validated to exactly the
   same standard as the public form and admin paper entry — catering and shirt counts stay complete
   however a person arrives. Posted form-encoded (a small flat form), unlike the registration forms
   which post $form as JSON. */
export const adminAddMemberSchema = personDetailsSchema.extend({
    name: z.string().trim().min(2, 'Please enter a name'),
})

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
    shirtSize: z.string().optional(),
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
    /* Ids removed during this sitting. Collected rather than acted on immediately, so the whole edit
       stays one save the registrant hears about once. */
    removedMemberIds: z.array(z.string()),
})

/* Only the statuses an organiser may set by hand. 'refunded' is absent on purpose: that transition
   must go through cancelRegistration so the money actually goes back — see
   setRegistrationStatus. */
export const adminSetStatusSchema = z.object({
    status: z.enum(['pending', 'paid', 'waived'], 'Please choose a status'),
})
