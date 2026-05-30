import { redirect } from '@sveltejs/kit'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'

type AuthEvent = ServerLoadEvent | RequestEvent

export function requireAuth(event: AuthEvent) {
    if (!event.locals.user) {
        dbg.auth('requireAuth: no user, redirecting to /login')
        throw redirect(302, '/login')
    }
    return event.locals.user
}
