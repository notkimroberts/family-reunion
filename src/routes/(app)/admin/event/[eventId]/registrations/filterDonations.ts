import type { DonationSummary } from '$lib/server/donations'
import { matchesSearch } from './_matchesSearch'

/* The Gifts lens: one row per donation, narrowed by the search box only.

   No status chips, for the same reason People has none: the chips name registration statuses, and a
   gift's states are not those. Every gift is listed, including the pending ones — an abandoned
   donation checkout is exactly what an organiser reconciling against Stripe is looking for.

   Matches the donor's name and email; the message is deliberately not searched, so a common word in
   somebody's dedication cannot pull unrelated rows into a search for a name. */
export function filterDonations(
    donations: readonly DonationSummary[],
    query: { search: string },
): DonationSummary[] {
    return donations.filter((donation) =>
        matchesSearch(query.search, [donation.donorName, donation.donorEmail]),
    )
}
