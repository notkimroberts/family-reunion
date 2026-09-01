import { error } from '@sveltejs/kit'
import { getApprovedPhoto } from '$lib/server/photos'
import type { PageServerLoad } from './$types'

/* One photo on its own URL, so a link pasted into a text thread or Facebook resolves to something.

   404s identically for pending, rejected and absent. A distinct "this was removed" would confirm
   that a rejected photo once existed at that id, which is exactly what rejecting it was meant to
   stop. */
export const load: PageServerLoad = async ({ params }) => {
    const photo = await getApprovedPhoto(params.id)
    if (!photo) {
        error(404, 'Photo not found')
    }
    return { photo }
}
