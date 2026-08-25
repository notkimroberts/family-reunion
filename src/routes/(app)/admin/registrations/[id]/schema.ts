import { z } from 'zod'
import { personDetailsSchema } from '../../../register/schema'

/* Offline add-member. Reuses personDetailsSchema so an admin addition is validated to exactly the
   same standard as the public form and admin paper entry — catering and shirt counts stay complete
   however a person arrives. Posted form-encoded (a small flat form), unlike the registration forms
   which post $form as JSON. */
export const adminAddMemberSchema = personDetailsSchema.extend({
    name: z.string().min(1, 'Name is required'),
})

/* Only the statuses an organiser may set by hand. 'refunded' is absent on purpose: that transition
   must go through cancelRegistration so the money actually goes back — see
   setRegistrationStatus. */
export const adminSetStatusSchema = z.object({
    status: z.enum(['pending', 'paid', 'waived'], 'Please choose a status'),
})
