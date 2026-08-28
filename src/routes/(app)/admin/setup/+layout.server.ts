import { requireOwner } from '$lib/server/auth/guards'
import type { LayoutServerLoad } from './$types'

/* Covers PAGE VIEWS under /admin/setup only. A layout load runs after a form action, so it cannot
   protect actions — every action and every remote function carries its own requireOwner. */
export const load: LayoutServerLoad = async (event) => {
    requireOwner(event)
    return {}
}
