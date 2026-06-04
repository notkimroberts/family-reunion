import { redirect } from '@sveltejs/kit'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'

type AuthEvent = ServerLoadEvent | RequestEvent

// Asserts a valid session exists; throws redirect(302, '/login') if no user on locals.
export function requireAuth(event: AuthEvent) {
    if (!event.locals.user) {
        dbg.auth('requireAuth: no user, redirecting to /login')
        throw redirect(302, '/login')
    }
    return event.locals.user
}
