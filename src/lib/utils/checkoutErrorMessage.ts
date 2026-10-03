import { CONTACT_EMAIL } from '$lib/general/constants'

const FORBIDDEN = 403

/* What to tell someone whose checkout submit failed before reaching Stripe — so, always, that
   nothing was charged. Chosen by status, not by message text: a 403 is the lock date passing while
   the form was open (assertRegistrationEditable); anything else is a server or network fault whose
   message ("Internal Error", "Failed to fetch") means nothing to a reader. superforms types the
   status as optional, so absent is treated as a fault. */
export function checkoutErrorMessage(status?: number): string {
    if (status === FORBIDDEN) {
        return `Registration has closed, so nothing was charged. To ask about a late place, email ${CONTACT_EMAIL}.`
    }
    return `Something went wrong and nothing was charged. Please try again, or email ${CONTACT_EMAIL}.`
}
