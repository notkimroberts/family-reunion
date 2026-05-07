import { type Handle } from '@sveltejs/kit'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { dev, building } from '$app/environment'
import { auth } from '$lib/server/auth'
import { dbg } from '$lib/server/debug'

const DEV_ADMIN_USER = {
    id: 'dev-admin',
    name: 'Dev Admin',
    email: 'admin@localhost',
    emailVerified: true,
    image: null,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
}

export const handle: Handle = async ({ event, resolve }) => {
    const session = await auth.api.getSession({
        headers: event.request.headers,
    })

    event.locals.user = session?.user ?? (dev ? DEV_ADMIN_USER : null)
    event.locals.session = session?.session ?? null

    dbg.hooks('session user=%s dev=%s', event.locals.user?.id ?? 'none', dev)

    return svelteKitHandler({ event, resolve, auth, building })
}
