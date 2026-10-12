import { redirect } from '@sveltejs/kit'
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit'
import { hasAdminAccess } from '$lib/general/roles'
import { dbg } from '$lib/server/debug'
import { requireAuth } from './requireAuth'

type AuthEvent = ServerLoadEvent | RequestEvent

// Asserts a session whose role is organizer or owner; throws redirect(302, '/') for anyone else.
export function requireAdmin(event: AuthEvent) {
    const user = requireAuth(event)
    if (!hasAdminAccess(user.role)) {
        dbg.auth('requireAdmin: user %s denied (role=%s)', user.id, user.role)
        throw redirect(302, '/')
    }
    return user
}
