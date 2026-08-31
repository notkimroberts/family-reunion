import { z } from 'zod'
import {
    DONATION_MAX_CENTS,
    DONATION_MIN_CENTS,
    HOTEL_STAY_ANSWERS,
    US_STATES,
} from '$lib/general/constants'
import { isValidPhone, isValidZip } from '$lib/utils'

/* No .transform() anywhere in here, deliberately. These schemas are used for client-side
   validation as well as server parsing, and a transform would rewrite what the user typed
   mid-edit — lowercasing an email under the cursor, for example. Normalisation (trimming names,
   lowercasing the email) happens once in the actions, which is also the only place that matters
   for what gets stored. */

const emailSchema = z.email('Please enter a valid email')
const tierIdSchema = z.string().min(1, 'Please select a tier')

const validStateCodes = new Set<string>(US_STATES.map((s) => s.value))
const stateSchema = z.string().refine((v) => validStateCodes.has(v), 'Please select a state')
const zipSchema = z.string().refine(isValidZip, 'Please enter a valid ZIP code')

/* Accepts '' so the type covers a freshly-rendered form where nothing has been answered yet, but
   refuses it on validation. Without '' in the type, $form could not hold the blank starting state
   and the store could not be the single source of truth. Boolean conversion happens explicitly
   wherever each value is consumed. */
const yesNoRequired = (message: string) =>
    /* `value.length > 0` rather than `value !== ''` on purpose. TypeScript 5.5+ infers type
       predicates, so `value !== ''` would narrow zod's OUTPUT type to 'yes' | 'no' — and
       superforms types $form from the output, which would then be unable to hold the unanswered
       '' that attendedReunion2025 still starts with.

       The '' must stay in the enum even now that vegetarianMeal is seeded 'no'. Removing it would
       narrow the output type and break $form's ability to represent a freshly rendered form. */
    z.enum(['yes', 'no', '']).refine((value) => value.length > 0, message)

/* Everything collected about one person besides their name. A nested object rather than a set of
   self*-prefixed keys, so $form can hold it as the single source of truth and components can bind
   one object instead of a prop per field. */
export const personDetailsSchema = z.object({
    tierId: tierIdSchema,
    birthDate: z.string().optional(),
    /* Required, unlike birthDate. Shirts are being made per attendee, so a missing size is a person
       without one — the reason the field exists at all. Accepts '' in the type for the same reason the
       yes/no answers do: a freshly rendered form has to be representable in $form. */
    shirtSize: z.string().min(1, 'Please choose a T-shirt size'),
    addressLine1: z.string().min(1, 'Street address is required'),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(1, 'City is required'),
    addressState: stateSchema,
    addressZip: zipSchema,
    vegetarianMeal: yesNoRequired('Please say whether they need a vegetarian meal'),
    attendedReunion2025: yesNoRequired(
        'Please say whether they attended the 2025 New Orleans reunion',
    ),
})

/* min(2), not min(1): a single character got saved as a party member's whole name. Not a full-name
   requirement — mononyms are real and a surname must not be forced. */
export const memberSchema = personDetailsSchema.extend({
    name: z.string().trim().min(2, 'Please enter a name'),
})

/* The host-hotel question. Three answers rather than two — see HOTEL_STAY_ANSWERS — and '' is in the
   type for the same reason it is in the yes/no answers: $form must be able to hold a freshly
   rendered form where nothing has been chosen. `value.length > 0` rather than `value !== ''` for the
   same TypeScript-predicate reason too.

   '' IS FIRST, and that ordering is load-bearing: superforms defaults an absent enum field to the
   FIRST value in the enum. With the answers first, a payload that omitted this field arrived as
   'yes' — a room silently added to the block for a family who was never asked. Unanswered is the
   only safe default, and it then fails this refine loudly instead. */
const hotelStayRequired = z
    .enum(['', ...HOTEL_STAY_ANSWERS])
    .refine(
        (value) => value.length > 0,
        'Please say whether your party will stay at the host hotel',
    )

/* The registration form's complete shape. Every field the form collects lives here and nowhere
   else: the pages post $form as JSON (dataType: 'json'), so there are no hidden inputs mirroring
   state into the DOM. Two production bugs came from that mirroring — a field missing from $form
   cancelled every submit, and a field missing from the DOM produced an incomplete POST. Neither
   is expressible now.

   First and last name are stored separately rather than derived into one contactName field, for
   the same reason: the composed value was another mirror. The actions join them. */
export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    contactFirstName: z.string().min(1, 'First name is required'),
    contactLastName: z.string().min(1, 'Last name is required'),
    contactEmail: emailSchema,
    contactPhone: z
        .string()
        .default('')
        .refine((val) => !val || isValidPhone(val), 'Please enter a valid phone number'),
    self: personDetailsSchema,
    members: z.array(memberSchema),
    /* Booking-level, not per-person: a household books rooms together. */
    stayingAtHostHotel: hotelStayRequired,
    /* An optional gift on top of the party's places, in cents.

       0 means none, which is why the floor is 0 here and DONATION_MIN_CENTS is applied only above
       it: a gift of $2 is not worth a charge, but a registration with no gift is the normal case
       and must not be an error. */
    donationCents: z
        .number()
        .int()
        .min(0)
        .max(DONATION_MAX_CENTS, 'That gift is larger than this form accepts')
        .refine(
            (cents) => cents === 0 || cents >= DONATION_MIN_CENTS,
            `A gift must be at least $${DONATION_MIN_CENTS / 100}`,
        )
        .default(0),
})

/* Admin paper entry validates identically to the public form — address, ZIP, state and both
   yes/no answers required — so catering and shirt counts are complete whichever way a
   registration arrives. Extends registrationSchema rather than restating the rules, so the two
   can only ever agree.

   The one addition is status: an admin records whether the money already arrived, was waived, or
   is still outstanding, since this path bypasses Stripe entirely. */
export const adminRegistrationSchema = registrationSchema.extend({
    status: z.enum(['paid', 'pending', 'waived'], 'Please choose a payment status'),
})

export type PersonDetailsData = z.infer<typeof personDetailsSchema>
export type RegistrationFormData = z.infer<typeof registrationSchema>
export type AdminRegistrationFormData = z.infer<typeof adminRegistrationSchema>
/* Output type — what the server has after parsing, so the yes/no fields are answered. */
export type MemberData = z.infer<typeof memberSchema>
/* Input type — what the form holds while being filled in, where the yes/no fields may still be
   ''. This is the distinction that lets $form be the single source of truth: the store carries
   the in-progress shape, and validation is what turns it into the output shape. */
export type MemberInputData = z.input<typeof memberSchema>
