import { redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { isOwner } from '$lib/server/auth/isOwner'
import { dbg } from '$lib/server/debug'
import { reportError } from '$lib/server/reportError'
import { requireAdmin } from './requireAdmin'
import type { AuthEvent } from './types'

/* Reported once per process, not per request. Every Setup page load and action calls this, so an
   unset variable would otherwise send a Sentry event on every click. */
let reportedMissingConfig = false

/* Asserts the caller is the owner — admin first, then identity. Redirects to /admin, not /login: the
   caller IS signed in and IS an admin, so bouncing them to a login form would be a lie.

   requireAdmin runs first deliberately, so a signed-out request still gets the /login redirect rather
   than being told it is the wrong person.

   Every Setup page needs this in its load AND in each of its actions AND in each remote function it
   calls. A SvelteKit layout load runs after a form action, so a layout guard cannot protect actions;
   remote functions are served from /_app/remote/<id> with route handling skipped entirely, so no
   layout or page guard sees them at all. */
export function requireOwner(event: AuthEvent) {
    const user = requireAdmin(event)

    if (!env.OWNER_EMAIL?.trim()) {
        /* Fails open — see isOwner. Reported rather than only logged, because dbg writes nothing under
           `node build/index.js`, and an unrestricted Setup area must not be a silent state. */
        if (!reportedMissingConfig) {
            reportedMissingConfig = true
            reportError(
                'OWNER_EMAIL is not set; Setup is open to every admin',
                new Error('OWNER_EMAIL unset'),
            )
        }
        return user
    }

    if (!isOwner(user, env.OWNER_EMAIL)) {
        dbg.auth('requireOwner: user %s denied (not the owner)', user.id)
        throw redirect(302, '/admin')
    }

    return user
}
