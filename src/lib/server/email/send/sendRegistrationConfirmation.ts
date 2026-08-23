import { dbg } from '$lib/server/debug'
import { renderRegistrationConfirmation } from '../templates'
import { send } from './_resend'

/* Sends a registration confirmation email with party members, total amount paid, and
   management link. Pass idempotencyKey (e.g. `confirm/<registrationId>`) so a redelivered
   Stripe webhook cannot produce a second copy. */
export async function sendRegistrationConfirmation(
    to: string,
    data: {
        name: string
        eventTitle: string
        partyMembers: string[]
        totalAmount: string
        manageUrl: string
    },
    idempotencyKey?: string,
): Promise<void> {
    dbg.email(
        'sendRegistrationConfirmation to=%s event=%s members=%d',
        to,
        data.eventTitle,
        data.partyMembers.length,
    )
    const { subject, text } = renderRegistrationConfirmation(data)
    await send({ to, subject, text, idempotencyKey })
}
