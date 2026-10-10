import type { EventStatus } from '$lib/general/constants'
import { isBeforeRegistrationOpens } from './isBeforeRegistrationOpens'
import { isRegistrationClosed } from './isRegistrationClosed'

export type RegistrationState =
    'draft' | 'scheduled' | 'open' | 'closedByDate' | 'closed' | 'archived'

/* Whether the public can register right now, from the status AND the two dates together.

   The status alone says `open` for a year whose opening date is still ahead or whose closing date has
   passed, and the settings page printed "accepting parties and payments" for both. The dates only
   matter while the status is `open`: every other status already refuses everyone. */
export function getRegistrationState(
    event: {
        status: EventStatus
        registrationOpensAt: Date | string | null
        registrationLockDate: Date | string | null
    },
    at: Date | number = Date.now(),
): RegistrationState {
    if (event.status !== 'open') {
        return event.status
    }
    if (isBeforeRegistrationOpens(event.registrationOpensAt, at)) {
        return 'scheduled'
    }
    if (isRegistrationClosed(event.registrationLockDate, at)) {
        return 'closedByDate'
    }
    return 'open'
}
