import { dbg } from '$lib/server/debug'
import { renderRegistrationConfirmation, type RegistrationConfirmationData } from '../templates'
import { send } from './_resend'

/* Sends a registration confirmation email with the party breakdown, the amount, and the
   management link. Pass idempotencyKey (e.g. `confirm/<registrationId>`) so a redelivered
   Stripe webhook cannot produce a second copy. */
export async function sendRegistrationConfirmation(
    to: string,
    data: RegistrationConfirmationData,
    idempotencyKey?: string,
): Promise<void> {
    dbg.email(
        'sendRegistrationConfirmation to=%s event=%s status=%s members=%d',
        to,
        data.eventTitle,
        data.status,
        data.partyMembers.length,
    )
    const { subject, text, html } = renderRegistrationConfirmation(data)
    await send({ to, subject, text, html, idempotencyKey })
}
