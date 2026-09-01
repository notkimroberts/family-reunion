import { getApprovedPhotos } from '$lib/server/photos'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    return { photos: await getApprovedPhotos() }
}
