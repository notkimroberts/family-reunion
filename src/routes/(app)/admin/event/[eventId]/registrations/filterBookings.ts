import type { RegistrationSummary } from '$lib/server/registrations'
import type { RegistrationStatus } from '$lib/utils'
import { matchesSearch } from './_matchesSearch'

/* The Bookings lens: one row per party, narrowed by the status chips and the search box.

   An undefined status is the unfiltered chip — "All" is not a status, so it cannot be a value.

   Searches the contact only. A booking is identified by whoever made it; searching the guests too
   would return parties whose visible row matches nothing an organiser typed, which reads as a bug. */
export function filterBookings(
    registrations: readonly RegistrationSummary[],
    query: { search: string; status: RegistrationStatus | undefined },
): RegistrationSummary[] {
    return registrations.filter(
        (registration) =>
            (query.status === undefined || registration.status === query.status) &&
            matchesSearch(query.search, [registration.contactName, registration.contactEmail]),
    )
}
