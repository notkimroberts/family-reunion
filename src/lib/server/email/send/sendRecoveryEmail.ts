import { dbg } from '$lib/server/debug'
import { renderRecoveryEmail } from '../templates'
import { send } from './_resend'

/* Sends a registration management link to a registrant who requested a fresh copy.
   No idempotency key: each request deliberately rotates the token, so every send carries a
   different link and suppressing a repeat would leave the registrant with a dead one. */
export async function sendRecoveryEmail(
    to: string,
    data: { eventTitle: string; manageUrl: string },
): Promise<void> {
    dbg.email('sendRecoveryEmail to=%s event=%s', to, data.eventTitle)
    const { subject, text, html } = renderRecoveryEmail(data)
    await send({ to, subject, text, html })
}
