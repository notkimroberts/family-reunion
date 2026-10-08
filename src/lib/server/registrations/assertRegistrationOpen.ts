import { error } from '@sveltejs/kit'
import { isBeforeRegistrationOpens } from '$lib/general/registration'
import { formatReunionDateTime } from '$lib/utils'

/* Throws 403 before an event's registration opens. The register page shows no form until then, so
   only a hand-made request reaches this — but the form being hidden is not the protection; this is.

   Takes the opening date the caller already has in scope, like assertRegistrationEditable, so it
   issues no query of its own. */
export function assertRegistrationOpen(registrationOpensAt: Date | null): void {
    if (registrationOpensAt && isBeforeRegistrationOpens(registrationOpensAt)) {
        throw error(403, `Registration opens ${formatReunionDateTime(registrationOpensAt, 'long')}`)
    }
}
