import { getApprovedPhotos, getPhotoYears } from '$lib/server/photos'
import type { PageServerLoad } from './$types'

/* The whole gallery in one load, filtered client-side by ?year.

   All approved photos, not a page of them: 290 rows of six columns is a small query, the grid is
   lazy-loaded so the bytes arrive on demand, and filtering by year without a round trip is what
   makes the year chips feel like chips rather than navigation. Revisit if the gallery reaches a
   few thousand. */
export const load: PageServerLoad = async () => {
    const [photos, years] = await Promise.all([getApprovedPhotos(), getPhotoYears()])
    return { photos, years }
}
