import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { reportError } from '$lib/server/reportError'
/* Relative import, not the $lib/server/registrations barrel: that barrel re-exports this folder, so
   going through it would be a circular import. */
import { getConfirmationEmailData } from '../queries'

/* The confirmation a Stripe payment ends with, for the webhook's registration and member_payment
   branches.

   Never throws. By the time it runs the payment is captured and the rows are written, and a 500 would
   make Stripe retry an event whose database work is done. But the guard that made this delivery the
   one that settled the payment also means a redelivery will NOT send it again, so this is the only
   attempt: a failure is reported, so it reaches a person. */
export async function sendConfirmation(params: {
    registrationId: string
    viewUrl: string
    idempotencyKey: string
}): Promise<void> {
    const confirmation = await getConfirmationEmailData({
        registrationId: params.registrationId,
        viewUrl: params.viewUrl,
    })
    if (!confirmation) {
        dbg.stripe(
            'no confirmation data for registration %s; skipping email',
            params.registrationId,
        )
        return
    }

    dbg.stripe('sending confirmation email for registration %s', params.registrationId)
    try {
        await sendRegistrationConfirmation(
            confirmation.to,
            confirmation.data,
            params.idempotencyKey,
        )
    } catch (err) {
        reportError('confirmation email failed', err, { registrationId: params.registrationId })
    }
}
