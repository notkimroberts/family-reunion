import { error } from '@sveltejs/kit'
import { isUuid } from '$lib/general/ids'
import { getApprovedPhoto, getPhotoNeighbours } from '$lib/server/photos'
import { parsePhotoYear } from '../parsePhotoYear'
import type { PageServerLoad } from './$types'

/* One photo on its own URL, so a link pasted into a text thread or Facebook resolves to something.

   404s identically for pending, rejected and absent. A distinct "this was removed" would confirm
   that a rejected photo once existed at that id, which is exactly what rejecting it was meant to
   stop.

   ?year is carried through from the grid so the arrows walk the filtered set. */
export const load: PageServerLoad = async ({ params, url }) => {
    /* Postgres errors on a malformed uuid rather than returning no rows, so /photos/banana would be
       a 500 and a Sentry report instead of a 404. */
    if (!isUuid(params.id)) {
        error(404, 'Photo not found')
    }

    const year = parsePhotoYear(url)
    const [photo, neighbours] = await Promise.all([
        getApprovedPhoto(params.id),
        getPhotoNeighbours(params.id, year),
    ])

    if (!photo || !neighbours) {
        error(404, 'Photo not found')
    }

    return { photo, neighbours, year }
}
