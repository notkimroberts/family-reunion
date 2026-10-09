import type { Handle } from '@sveltejs/kit'
import { APP_DOMAIN } from '$lib/general/constants'

const WWW_HOST = `www.${APP_DOMAIN}`

/* `www` is a second Railway domain, so it gets a certificate and answers HTTPS; this sends it on to
   the bare domain. It was a Namecheap URL Redirect, which answered only plain http — an https://www
   link hung — and dropped the path, so www…/register landed on the home page.

   301, path and query kept. Only `www.<APP_DOMAIN>`: any other Host passes through untouched. Ahead
   of the session handler, so a www request never reaches Better Auth, whose cookies and
   BETTER_AUTH_URL name the bare domain; after securityHeaders, so the redirect carries HSTS. */
export const wwwRedirect: Handle = async ({ event, resolve }) => {
    if (event.url.hostname !== WWW_HOST) {
        return resolve(event)
    }
    return new Response(undefined, {
        status: 301,
        headers: { location: `https://${APP_DOMAIN}${event.url.pathname}${event.url.search}` },
    })
}
