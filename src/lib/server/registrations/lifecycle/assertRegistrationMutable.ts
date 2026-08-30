import { error } from '@sveltejs/kit'
import type { registrationStatusEnum } from '$lib/server/db/schema'

type RegistrationStatus = (typeof registrationStatusEnum.enumValues)[number]

/* 'refunded' is terminal. The party was cancelled and the money returned, so there is nothing left
   to edit, add to, remove from, re-price or re-status — every such change would describe a booking
   that no longer exists, against money that is gone. Re-registering is the route back. */
const TERMINAL_STATUSES: readonly RegistrationStatus[] = ['refunded']

/* Refuses a change to a registration that has been cancelled.

   Seven places asked this question inline, each spelling out `=== 'refunded'` for itself: five
   management functions, the admin save action, and getConfirmationEmailData, which expresses it as
   returning undefined instead of throwing. Adding a second terminal status would have meant finding
   all seven.

   The MESSAGE stays with the caller. What an organiser should do next is different when they were
   trying to add someone than when they were renaming the contact, and collapsing seven specific
   sentences into one generic 409 would trade a real thing for a tidy one. */
export function assertRegistrationMutable(status: RegistrationStatus, message: string): void {
    if (TERMINAL_STATUSES.includes(status)) {
        throw error(409, message)
    }
}
