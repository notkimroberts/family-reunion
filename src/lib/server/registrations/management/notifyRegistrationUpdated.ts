import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendRegistrationConfirmation } from '$lib/server/email'
import { deliverManagementLink } from '../deliverManagementLink'
import { touchRegistration } from '../lifecycle'
import { getConfirmationEmailData } from '../queries/getConfirmationEmailData'

/* Derives the Resend idempotency key from what changed, rather than from the registration or the
   clock. sendRegistrationConfirmation is called elsewhere with `confirm/<registrationId>`; reusing a
   per-registration key here would make Resend silently drop every update after the first — told once
   and never again, worse than not having the feature. A timestamp goes too far the other way and lets
   a double-submitted save send twice. Hashing the summary suppresses a retry of the same save while
   letting a genuinely different change through. */
function changeFingerprint(changeSummary: string[]): string {
    return createHash('sha256').update(changeSummary.join('|')).digest('hex').slice(0, 16)
}

/* Tells the registrant that an organiser changed their registration, and gives them a link that
   works.

   Rotates because it must: only sha256(token) is stored, so the link in the email has to be a fresh
   one, and without the rotation this notification would break the very access it is announcing. The
   send-before-rotate ordering lives in deliverManagementLink.

   Throws on send failure, and the caller is expected to report it WITHOUT failing the save — the
   organiser's change is already committed by then, so presenting it as failed would be a lie. */
export async function notifyRegistrationUpdated(params: {
    registrationId: string
    changeSummary: string[]
    manageUrl: (token: string) => string
}): Promise<{ sent: boolean }> {
    if (params.changeSummary.length === 0) {
        return { sent: false }
    }

    const delivery = await deliverManagementLink({
        registrationId: params.registrationId,
        deliver: async (token) => {
            const payload = await getConfirmationEmailData({
                registrationId: params.registrationId,
                manageUrl: params.manageUrl(token),
            })

            /* undefined covers a missing registration/event and a refunded one, none of which has an
               update worth announcing. Returning 'skipped' leaves the token unrotated, so nothing is
               broken for a registrant who was never emailed. */
            if (!payload) {
                dbg.email('no update notification for registration %s', params.registrationId)
                return 'skipped'
            }

            await sendRegistrationConfirmation(
                payload.to,
                { ...payload.data, isUpdate: true, changeSummary: params.changeSummary },
                `update/${params.registrationId}/${changeFingerprint(params.changeSummary)}`,
            )
            return 'sent'
        },
    })

    if (delivery === 'skipped') {
        return { sent: false }
    }

    /* Stamped after the send so the row's updatedAt reflects the notified state. */
    await touchRegistration(params.registrationId)

    dbg.email(
        'sent update notification for registration %s (%d change(s))',
        params.registrationId,
        params.changeSummary.length,
    )

    return { sent: true }
}
