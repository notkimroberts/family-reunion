import { z } from 'zod'
import { DONATION_MAX_CENTS, DONATION_MIN_CENTS } from '$lib/general/constants'

/* The standalone gift form.

   Unlike the gift on the registration form, an amount is REQUIRED here — the whole page is the
   gift, so zero is not "no thanks", it is an empty submission. The bounds are the shared constants,
   so the client validator and the server parse cannot disagree.

   No .transform(): this schema also runs client-side, where a transform rewrites what someone is
   halfway through typing. The action lowercases the email, as the registration action does. */
export const donationSchema = z.object({
    donorName: z.string().trim().min(2, 'Please enter your name'),
    donorEmail: z.email('Please enter a valid email'),
    amountCents: z
        .number()
        .int()
        .min(DONATION_MIN_CENTS, `Please give at least $${DONATION_MIN_CENTS / 100}`)
        .max(DONATION_MAX_CENTS, 'That is larger than this form accepts'),
    /* Bounded because it is stored and shown to organisers; a runaway paste is not a message. */
    message: z.string().trim().max(500, 'Please keep the message under 500 characters').optional(),
})

export type DonationFormData = z.infer<typeof donationSchema>
