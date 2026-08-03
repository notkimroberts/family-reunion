import { error } from '@sveltejs/kit'

/* Throws 403 once an event's registrationLockDate has passed. Organizers use this to freeze
   all registration changes (detail edits, add/remove member, cancel) ahead of an event.
   Callers pass the lock date they already have in scope (from a query they were running
   anyway) so this never issues its own DB round trip. */
export function assertRegistrationEditable(registrationLockDate: Date | null): void {
    if (registrationLockDate && registrationLockDate < new Date()) {
        throw error(403, 'Registration changes are closed for this event')
    }
}
