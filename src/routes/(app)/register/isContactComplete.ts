import { contactSaveProblems } from './contactSaveProblems'
import type { PersonDetails } from './types'

/* Whether the contact's own details are complete enough to submit.

   Both the public form and admin paper entry need the identical predicate, and it mirrors the
   required fields of registrationSchema — a pure function can be unit tested against that schema,
   where a `$derived` expression duplicated across two components cannot. Both pages previously
   carried their own copy and had already drifted (the public one also checked phone validity).

   Defined as "contactSaveProblems found nothing" rather than as a second list of the same checks:
   the card's Save alert and this gate must agree, and the only way to guarantee that is one
   implementation.

   Deliberately excludes phone: it is optional, so its validity is a separate concern the caller
   adds. Excludes `saved` too — that is UI state, not data completeness. */
export function isContactComplete(contact: {
    firstName: string
    lastName: string
    email: string
    details: PersonDetails
}): boolean {
    return contactSaveProblems({ ...contact, phone: '' }).length === 0
}
