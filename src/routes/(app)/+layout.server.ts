import { redirect } from '@sveltejs/kit'
import { isPublicPath } from '$lib/server/auth/guards'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
    if (!locals.user && !isPublicPath(url.pathname)) {
        throw redirect(302, '/login')
    }

    return {
        user: locals.user ?? null,
    }
}
