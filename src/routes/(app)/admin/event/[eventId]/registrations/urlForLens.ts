import type { RegistrationsLens } from './registrationsViewUrl'

/* The URL to navigate to for a lens, leaving every other parameter alone.

   Bookings DELETES the parameter rather than setting view=bookings, so the two ways of expressing
   the default cannot both exist in the wild and disagree with lensFromUrl. */
export function urlForLens(current: URL, lens: RegistrationsLens): URL {
    const next = new URL(current)
    if (lens === 'people') {
        next.searchParams.set('view', 'people')
    } else {
        next.searchParams.delete('view')
    }
    return next
}
