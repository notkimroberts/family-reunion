import { error } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { sendRecoveryEmail } from '$lib/server/email'
import { deliverViewLink } from '../deliverViewLink'
import { getRegistrationWithEvent } from '../queries/getRegistrationWithEvent'

/* Emails the registrant a fresh view link, for when an organiser needs to get them back
   into their registration.

   The send-before-rotate ordering — and the reason a registrant is locked out permanently if it is
   reversed — lives in deliverViewLink, which this shares with the update notification and
   /register/recover. */
export async function reissueViewLink(params: {
    registrationId: string
    /* Builds the view URL from the fresh plaintext token; the caller owns the origin. */
    viewUrl: (token: string) => string
}): Promise<void> {
    const found = await getRegistrationWithEvent(params.registrationId)
    if (!found) {
        throw error(404, 'Registration not found')
    }

    await deliverViewLink({
        registrationId: params.registrationId,
        deliver: async (token) => {
            await sendRecoveryEmail(found.registration.contactEmail, {
                eventTitle: found.event.title,
                viewUrl: params.viewUrl(token),
            })
            return 'sent'
        },
    })

    dbg.register('admin re-issued view link for registration %s', params.registrationId)
}
