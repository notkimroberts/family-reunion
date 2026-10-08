import type { HandleServerError } from '@sveltejs/kit'
import { dbg } from '$lib/server/debug'

const NOT_FOUND_STATUS = 404

/* Error handler given to Sentry's handleErrorWithSentry. Sentry already skips 4xx, but its default
   handler still prints the stack of every one — so each bot probing /contact-us wrote a 20-line
   stack trace at error level. A 404 is one dbg line; everything else keeps its stack. */
export const logServerError: HandleServerError = ({ error, event, status }) => {
    if (status === NOT_FOUND_STATUS) {
        dbg.hooks('not found %s', event.url.pathname)
        return
    }
    console.error(error instanceof Error ? error.stack : error)
}
