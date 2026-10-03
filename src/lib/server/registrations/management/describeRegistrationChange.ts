import type { RegistrationChange } from '$lib/server/email'

/* One change as a single line — "Bo Patterson — T-shirt: M → L" — for the organiser's save
   feedback and the update email's idempotency fingerprint. The email itself renders the parts
   separately. */
export function describeRegistrationChange(change: RegistrationChange): string {
    if (change.before === undefined || change.after === undefined) {
        return change.summary
    }
    return `${change.summary}: ${change.before} → ${change.after}`
}
