import { requireAdmin } from '$lib/server/auth/guards'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)
}
