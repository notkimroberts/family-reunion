import { z } from 'zod'

const currentYear = new Date().getFullYear()

export const registrationSchema = z.object({
    eventId: z.string().min(1, 'Please select an event'),
    members: z.string().refine((val) => {
        try {
            const parsed = JSON.parse(val)
            return Array.isArray(parsed) && parsed.length > 0
        } catch {
            return false
        }
    }, 'Add at least one party member'),
})

export const memberSchema = z.object({
    name: z.string().min(1),
    birthYear: z.number().int().min(1900).max(currentYear),
    birthMonth: z.number().int().min(1).max(12).nullable(),
    birthDay: z.number().int().min(1).max(31).nullable(),
    tierId: z.string().min(1),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
export type MemberData = z.infer<typeof memberSchema>
