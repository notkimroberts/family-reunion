import { matchesSearch } from '$lib/general/search'
import type { RegistrationSummary } from '$lib/server/registrations'
import { getBookingDisplayStatus, type DisplayStatus } from '$lib/utils'

/* The Bookings lens: one row per party, narrowed by the status chips and the search box.

   An undefined status is the unfiltered chip — "All" is not a status, so it cannot be a value. The
   chips match the status a row SHOWS, so Paid lists no booking whose badge says Partly paid.

   Searches the contact only. A booking is identified by whoever made it; searching the guests too
   would return parties whose visible row matches nothing an organizer typed, which reads as a bug. */
export function filterBookings(
    registrations: readonly RegistrationSummary[],
    query: { search: string; status: DisplayStatus | undefined },
): RegistrationSummary[] {
    return registrations.filter(
        (registration) =>
            (query.status === undefined ||
                getBookingDisplayStatus(registration) === query.status) &&
            matchesSearch(query.search, [registration.contactName, registration.contactEmail]),
    )
}
