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

export const addMemberSchema = z.object({
    registrationId: z.string().min(1),
    name: z.string().min(1, 'Name is required'),
    tierId: z.string().min(1, 'Please select a pricing tier'),
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
})

export const updateMemberSchema = z.object({
    memberId: z.string().min(1),
    birthDate: z.string().optional(),
    shirtSize: z.string().optional(),
})

export const removeMemberSchema = z.object({
    memberId: z.string().min(1),
})

export const cancelRegistrationSchema = z.object({
    registrationId: z.string().min(1),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>
export type MemberData = z.infer<typeof memberSchema>
export type AddMemberData = z.infer<typeof addMemberSchema>
export type UpdateMemberData = z.infer<typeof updateMemberSchema>
