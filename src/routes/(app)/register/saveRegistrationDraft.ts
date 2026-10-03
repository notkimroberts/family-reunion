import { REGISTRATION_DRAFT_KEY } from './REGISTRATION_DRAFT_KEY'
import type { RegistrationFormData } from './schema'

/* Keeps the submitted form so a registrant who backs out of Stripe gets it back instead of a blank
   page. Called from superForm's onResult just before the redirect to Stripe.

   NEVER THROWS. superforms turns an exception in onResult into an error result, which would stop
   the redirect to Stripe — a failed convenience must not cost a payment. The sessionStorage getter
   itself can throw (SecurityError with storage disabled), so the access is inside the try too. */
export function saveRegistrationDraft(data: RegistrationFormData): void {
    try {
        sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({ version: 1, data }))
    } catch {
        /* Storage unavailable or full: the registrant re-types, as before. */
    }
}
