import { dbg } from '$lib/server/debug'
import { renderCancellationEmail, type CancellationEmailData } from '../templates'
import { send } from './_resend'

/* Sends the record of a cancelled registration: who was cancelled, what is going back, and how to
   register again.

   Pass idempotencyKey (`cancel/<registrationId>`) so a double-submitted confirmation dialog cannot
   deliver two of these. */
export async function sendCancellationEmail(
    to: string,
    data: CancellationEmailData,
    idempotencyKey?: string,
): Promise<void> {
    dbg.email(
        'sendCancellationEmail to=%s event=%s route=%s party=%d',
        to,
        data.eventTitle,
        data.refundRoute,
        data.partyNames.length,
    )
    const { subject, text, html } = renderCancellationEmail(data)
    await send({ to, subject, text, html, idempotencyKey })
}
