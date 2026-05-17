import { z } from 'zod'

export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    selfBirthDate: z.string().date('Please enter your birthday'),
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
    birthDate: z.string().date(),
    tierId: z.string().min(1),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
export type MemberData = z.infer<typeof memberSchema>
