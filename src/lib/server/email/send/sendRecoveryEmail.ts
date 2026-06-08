import { dbg } from '$lib/server/debug'
import { renderRecoveryEmail } from '../templates'
import { send } from './_resend'

/* Sends a registration management link to a registrant who requested a fresh copy. */
export async function sendRecoveryEmail(
    to: string,
    data: { eventTitle: string; manageUrl: string },
): Promise<void> {
    dbg.email('sendRecoveryEmail to=%s event=%s', to, data.eventTitle)
    const { subject, text } = renderRecoveryEmail(data)
    await send(to, subject, text)
}
