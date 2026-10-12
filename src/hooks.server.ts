import * as Sentry from '@sentry/sveltekit'
import { type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { building, dev } from '$app/environment'
import { OWNER_ROLE } from '$lib/general/constants'
import { auth } from '$lib/server/auth'
import { sessionLocals } from '$lib/server/auth/sessionLocals'
import { canonicalHostRedirect } from '$lib/server/canonicalHostRedirect'
import { dbg } from '$lib/server/debug'
import { logServerError } from '$lib/server/logServerError'
import { securityHeaders } from '$lib/server/securityHeaders'

/* The owner, so local dev reaches every screen. To see the organizer's view, sign in as one. */
const DEV_ADMIN_USER = {
    id: 'dev-admin',
    name: 'Dev Admin',
    email: 'admin@localhost',
    emailVerified: true,
    image: null,
    role: OWNER_ROLE,
    createdAt: new Date(),
    updatedAt: new Date(),
}

/* securityHeaders sits outside the session handler so it also covers /api/auth/*, which Better Auth
   answers without calling resolve. */
export const handle: Handle = sequence(
    Sentry.sentryHandle(),
    securityHeaders,
    canonicalHostRedirect,
    async ({ event, resolve }) => {
        const session = await auth.api.getSession({
            headers: event.request.headers,
        })

        const locals = sessionLocals(session, dev ? DEV_ADMIN_USER : null)
        event.locals.user = locals.user
        event.locals.session = locals.session

        dbg.hooks(
            'session user=%s dev=%s awaitingSetup=%s',
            event.locals.user?.id ?? 'none',
            dev,
            session !== null && locals.user === null,
        )

        return svelteKitHandler({ event, resolve, auth, building })
    },
)

export const handleError = Sentry.handleErrorWithSentry(logServerError)
