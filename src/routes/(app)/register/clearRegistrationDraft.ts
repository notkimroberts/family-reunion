import { REGISTRATION_DRAFT_KEY } from './REGISTRATION_DRAFT_KEY'

/* Drops the form kept for a cancelled checkout. Called where a checkout has succeeded, so addresses
   and birth dates do not sit in storage for the life of the tab. Never throws: storage access itself
   can (SecurityError), and this is housekeeping. */
export function clearRegistrationDraft(): void {
    try {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY)
    } catch {
        /* Nothing stored, or nothing reachable. */
    }
}
