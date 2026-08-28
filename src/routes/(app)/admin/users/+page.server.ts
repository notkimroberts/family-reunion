import { requireOwner } from '$lib/server/auth/guards'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireOwner(event)
}
