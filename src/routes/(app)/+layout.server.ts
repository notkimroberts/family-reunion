import { redirect } from '@sveltejs/kit'
import { isPublicPath } from '$lib/server/auth/guards'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
    /* Non-public pages in this group are admin-only. Testing merely for a session was not
       enough: Better Auth's email+password provider exposes a sign-up endpoint, so anyone
       could mint a role='user' account and satisfy a presence-only check. Sign-up is now
       disabled too — this is the second of the two locks, so neither alone is load-bearing. */
    if (!isPublicPath(url.pathname) && locals.user?.role !== 'admin') {
        throw redirect(302, '/login')
    }

    return {
        user: locals.user ?? null,
    }
}
