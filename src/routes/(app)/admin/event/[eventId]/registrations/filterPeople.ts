import type { EventPerson } from '$lib/server/registrations'
import { matchesSearch } from './_matchesSearch'

/* The People lens: one row per attendee, narrowed by the search box only.

   No status filter, and that is deliberate rather than missing. getEventPeople already returns
   paid-and-waived attendees only, so a chip here could only ever remove rows without saying why.

   Matches the person AND whoever registered them: an organiser is as likely to be handed "the
   Pattersons" as a first name, and a child's own name may not be the one on the booking. */
export function filterPeople(
    people: readonly EventPerson[],
    query: { search: string },
): EventPerson[] {
    return people.filter((person) => matchesSearch(query.search, [person.name, person.contactName]))
}
