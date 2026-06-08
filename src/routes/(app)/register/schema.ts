import { z } from 'zod'

/* Trim + lowercase incoming emails so recovery and dedup lookups are stable. */
const normalizedEmail = z
    .email('Please enter a valid email')
    .transform((s) => s.trim().toLowerCase())

export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    contactName: z
        .string()
        .min(1, 'Your name is required')
        .transform((s) => s.trim()),
    contactEmail: normalizedEmail,
    selfTierId: z.string().min(1, 'Please select your pricing tier'),
    selfBirthDate: z.string().min(1, 'Birthday is required'),
    selfShirtSize: z.string().optional(),
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
    tierId: z.string().min(1),
    birthDate: z.string().min(1, 'Birthday is required'),
    shirtSize: z.string().optional(),
})

export const addMemberSchema = z.object({
    token: z.string().min(1),
    registrationId: z.string().min(1),
    name: z.string().min(1, 'Name is required'),
    tierId: z.string().min(1, 'Please select a pricing tier'),
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
})

export const updateMemberSchema = z.object({
    token: z.string().min(1),
    memberId: z.string().min(1),
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
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
