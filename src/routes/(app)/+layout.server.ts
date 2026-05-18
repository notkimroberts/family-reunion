import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
    const publicPaths = ['/', '/family-tree', '/gallery', '/program', '/shop']
    const isPublic = publicPaths.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))

    if (!locals.user && !isPublic) {
        throw redirect(302, '/login')
    }

    return {
        user: locals.user ?? null,
    }
}
