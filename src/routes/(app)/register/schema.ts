import { z } from 'zod'

export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    selfTierId: z.string().min(1, 'Please select your pricing tier'),
    selfBirthDate: z.string().optional(),
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
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
export type MemberData = z.infer<typeof memberSchema>
