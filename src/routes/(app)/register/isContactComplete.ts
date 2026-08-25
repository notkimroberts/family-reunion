import { isValidZip } from '$lib/utils'
import type { PersonDetails } from './types'

/* Whether the contact's own details are complete enough to submit.

   Extracted because both the public form and admin paper entry need the identical predicate, and
   because it mirrors the required fields of registrationSchema — a pure function can be unit
   tested against that schema, where a `$derived` expression duplicated across two components
   cannot. Both pages previously carried their own copy and had already drifted (the public one
   also checked phone validity).

   Deliberately excludes phone: it is optional, so its validity is a separate concern the caller
   adds. Excludes `saved` too — that is UI state, not data completeness. */
export function isContactComplete(contact: {
    firstName: string
    lastName: string
    email: string
    details: PersonDetails
}): boolean {
    const { firstName, lastName, email, details } = contact
    return (
        !!firstName.trim() &&
        !!lastName.trim() &&
        !!email.trim() &&
        !!details.tierId &&
        !!details.addressLine1.trim() &&
        !!details.addressCity.trim() &&
        !!details.addressState.trim() &&
        !!details.addressZip.trim() &&
        isValidZip(details.addressZip) &&
        !!details.vegetarianMeal &&
        !!details.attendedReunion2025
    )
}
