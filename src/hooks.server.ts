import * as Sentry from '@sentry/sveltekit'
import { type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { building, dev } from '$app/environment'
import { auth } from '$lib/server/auth'
import { dbg } from '$lib/server/debug'
import { logServerError } from '$lib/server/logServerError'
import { securityHeaders } from '$lib/server/securityHeaders'

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

/* securityHeaders sits outside the session handler so it also covers /api/auth/*, which Better Auth
   answers without calling resolve. */
export const handle: Handle = sequence(
    Sentry.sentryHandle(),
    securityHeaders,
    async ({ event, resolve }) => {
        const session = await auth.api.getSession({
            headers: event.request.headers,
        })

        event.locals.user = session?.user ?? (dev ? DEV_ADMIN_USER : null)
        event.locals.session = session?.session ?? null

        dbg.hooks('session user=%s dev=%s', event.locals.user?.id ?? 'none', dev)

        return svelteKitHandler({ event, resolve, auth, building })
    },
)

export const handleError = Sentry.handleErrorWithSentry(logServerError)
