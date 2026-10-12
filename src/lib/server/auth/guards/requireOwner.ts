import { redirect } from '@sveltejs/kit'
import { isOwner } from '$lib/server/auth/isOwner'
import { dbg } from '$lib/server/debug'
import { requireAdmin } from './requireAdmin'
import type { AuthEvent } from './types'

/* Asserts the caller is the owner — admin first, then role. Redirects to /admin, not /login: the
   caller IS signed in and IS an organizer, so bouncing them to a login form would be a lie.

   requireAdmin runs first deliberately, so a signed-out request still gets the /login redirect rather
   than being told it is the wrong person.

   Fails CLOSED: with no owner row, nobody passes until `bun run admin:set-role <email> owner`.

   Every owner-only load, action and remote function needs this. A SvelteKit layout load runs after a
   form action, so a layout guard cannot protect actions; remote functions are served from
   /_app/remote/<id> with route handling skipped entirely, so no layout or page guard sees them. */
export function requireOwner(event: AuthEvent) {
    const user = requireAdmin(event)

    if (!isOwner(user)) {
        dbg.auth('requireOwner: user %s denied (not the owner)', user.id)
        throw redirect(302, '/admin')
    }

    return user
}
