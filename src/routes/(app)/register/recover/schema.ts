import { z } from 'zod'

export const recoverSchema = z.object({
    email: z.email('Please enter a valid email').transform((s) => s.trim().toLowerCase()),
})

export type RecoverData = z.infer<typeof recoverSchema>
