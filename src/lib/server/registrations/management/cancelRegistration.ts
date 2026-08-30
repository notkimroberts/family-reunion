import { error } from '@sveltejs/kit'
import { assertRegistrationEditable } from '../assertRegistrationEditable'
import { getRegistrationLockDate } from '../getRegistrationLockDate'
import { getRegistrationByToken } from '../queries/getRegistrationByToken'
import { _performCancellation } from './_performCancellation'

/* The registrant cancelling their own registration, from /register/manage.

   Token-gated, compared by hash: 404 on mismatch. Everything that happens after the token checks out —
   the refunds, the loud failure when one does not go through, the status write and the cancellation
   email — is in _performCancellation, shared with the organiser's cancel so the two cannot diverge on
   how money is returned. */
export async function cancelRegistration(
    registrationId: string,
    managementToken: string,
    /* Absolute link back to the registration form, built from the request origin by the caller — the
       same way fulfillCheckout builds manageUrl. Deliberately not derived from APP_DOMAIN here: that
       constant is still a placeholder, and a cancellation email pointing at the wrong host is a dead
       end for someone who has changed their mind. Required, so no call site can forget it and leave
       the email with a broken button. */
    registerUrl: string,
): Promise<void> {
    const registration = await getRegistrationByToken(managementToken)
    if (!registration || registration.id !== registrationId) {
        throw error(404)
    }

    assertRegistrationEditable(await getRegistrationLockDate(registration.eventId))

    await _performCancellation(registration, registerUrl)
}
