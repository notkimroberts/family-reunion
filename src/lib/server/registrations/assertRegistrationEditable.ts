import { error } from '@sveltejs/kit'
import { isRegistrationClosed } from '$lib/general/registration'

/* Throws 403 once an event's registrationLockDate has passed. Organizers use this to freeze
   all registration changes ahead of an event.

   The predicate itself is shared with the pages that decide whether to offer registration at all
   (isRegistrationClosed), so the form a visitor is shown and the answer they get on submit cannot
   disagree. Callers pass the lock date they already have in scope (from a query they were running
   anyway) so this never issues its own DB round trip. */
export function assertRegistrationEditable(registrationLockDate: Date | null): void {
    if (isRegistrationClosed(registrationLockDate)) {
        throw error(403, 'Registration changes are closed for this event')
    }
}
