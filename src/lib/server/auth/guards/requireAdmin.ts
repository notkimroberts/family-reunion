import { redirect } from '@sveltejs/kit'
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'
import { requireAuth } from './requireAuth'

type AuthEvent = ServerLoadEvent | RequestEvent

// Asserts session exists and user.role === 'admin'; throws redirect(302, '/') for non-admins.
export function requireAdmin(event: AuthEvent) {
    const user = requireAuth(event)
    if (user.role !== 'admin') {
        dbg.auth('requireAdmin: user %s denied (role=%s)', user.id, user.role)
        throw redirect(302, '/')
    }
    return user
}
