import { z } from 'zod'
import { US_STATES } from '$lib/general/constants'
import { isValidPhone, isValidZip } from '$lib/utils'

/* Trim + lowercase incoming emails so recovery and dedup lookups are stable. */
const normalizedEmail = z
    .email('Please enter a valid email')
    .transform((s) => s.trim().toLowerCase())

const tierIdSchema = z.string().min(1, 'Please select a tier')

const validStateCodes = new Set<string>(US_STATES.map((s) => s.value))
const stateSchema = z.string().refine((v) => validStateCodes.has(v), 'Please select a state')
const zipSchema = z.string().refine(isValidZip, 'Please enter a valid ZIP code')

/* Plain string enum (no transform) so the client-bound form value and the server-parsed
   value share the same 'yes' | 'no' type — boolean conversion happens explicitly wherever
   each value is consumed, same as how tierId/category was always handled. */
const yesNoRequired = (message: string) => z.enum(['yes', 'no'], message)

/* Fields shared by every "describe one party member" schema — tier, birthday, shirt size,
   mailing address, and the two yes/no questions. Registration's self* fields keep their own
   prefixed keys/messages below since zod object keys can't be dynamically renamed. */
const personDetailsShape = {
    tierId: tierIdSchema,
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
    addressLine1: z.string().min(1, 'Street address is required'),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(1, 'City is required'),
    addressState: stateSchema,
    addressZip: zipSchema,
    vegetarianMeal: yesNoRequired('Please say whether they need a vegetarian meal'),
    attendedReunion2025: yesNoRequired(
        'Please say whether they attended the 2025 New Orleans reunion',
    ),
}

export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    contactName: z
        .string()
        .min(1, 'Your name is required')
        .transform((s) => s.trim()),
    contactEmail: normalizedEmail,
    contactPhone: z
        .string()
        .default('')
        .refine((val) => !val || isValidPhone(val), 'Please enter a valid phone number'),
    selfTierId: tierIdSchema,
    selfBirthDate: z.string().optional(),
    selfShirtSize: z.string().optional(),
    selfAddressLine1: z.string().min(1, 'Street address is required'),
    selfAddressLine2: z.string().optional(),
    selfAddressCity: z.string().min(1, 'City is required'),
    selfAddressState: stateSchema,
    selfAddressZip: zipSchema,
    selfVegetarianMeal: yesNoRequired('Please say whether you need a vegetarian meal'),
    selfAttendedReunion2025: yesNoRequired(
        'Please say whether you attended the 2025 New Orleans reunion',
    ),
    members: z.string().refine((val) => {
        try {
            const parsed = JSON.parse(val)
            return Array.isArray(parsed)
        } catch {
            return false
        }
    }, 'Invalid members data'),
})

export const memberSchema = z.object({
    name: z.string().min(1),
    ...personDetailsShape,
})

export const addMemberSchema = z.object({
    token: z.string().min(1),
    registrationId: z.string().min(1),
    name: z.string().min(1, 'Name is required'),
    ...personDetailsShape,
})

export const updateMemberSchema = z.object({
    token: z.string().min(1),
    memberId: z.string().min(1),
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
    /* Raw 'yes'/'no'/'' string, same undefined-preserve/''-clear convention as shirtSize —
       see updateMemberDetails.ts. Not a yes/no zod enum since '' (clear) must stay valid. */
    vegetarianMeal: z.string().optional(),
})

export const removeMemberSchema = z.object({
    token: z.string().min(1),
    memberId: z.string().min(1),
})

export const cancelRegistrationSchema = z.object({
    token: z.string().min(1),
    registrationId: z.string().min(1),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
export type MemberData = z.infer<typeof memberSchema>
export type AddMemberData = z.infer<typeof addMemberSchema>
export type UpdateMemberData = z.infer<typeof updateMemberSchema>
