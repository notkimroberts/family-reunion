import { dbg } from '$lib/server/debug'
import { renderRegistrationConfirmation } from '../templates'
import { send } from './_resend'

/* Sends a registration confirmation email with party members, total amount paid, and management link. */
export async function sendRegistrationConfirmation(
    to: string,
    data: {
        name: string
        eventTitle: string
        partyMembers: string[]
        totalAmount: string
        manageUrl: string
    },
): Promise<void> {
    dbg.email(
        'sendRegistrationConfirmation to=%s event=%s members=%d',
        to,
        data.eventTitle,
        data.partyMembers.length,
    )
    const { subject, text } = renderRegistrationConfirmation(data)
    await send(to, subject, text)
}
