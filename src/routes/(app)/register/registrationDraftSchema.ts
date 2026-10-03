import { z } from 'zod'
import { registrationSchema } from './schema'

/* The stored draft: the form as it was posted, under a version so a shape change in a later deploy
   discards an old draft rather than restoring it half-filled. */
export const registrationDraftSchema = z.object({
    version: z.literal(1),
    data: registrationSchema,
})
