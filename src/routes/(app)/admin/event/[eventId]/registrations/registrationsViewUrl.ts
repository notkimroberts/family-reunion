export type RegistrationsLens = 'bookings' | 'people' | 'donations'

/* The lens lives in the URL so it survives a reload and a trip into a registration and back.

   Bookings is the absent-parameter default: it is the lens an organiser wants on arrival, and a
   default spelled into the query string is a default that can drift from the one the page renders.

   Local to this route and meaningless anywhere else — unlike the ?eventId filter it replaced, which
   meant "the open event" to one page and "all years" to another. */
export function lensFromUrl(url: URL): RegistrationsLens {
    const view = url.searchParams.get('view')
    if (view === 'people') {
        return 'people'
    }
    if (view === 'donations') {
        return 'donations'
    }
    return 'bookings'
}
