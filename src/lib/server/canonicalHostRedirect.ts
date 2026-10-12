import type { Handle } from '@sveltejs/kit'
import { APP_DOMAIN } from '$lib/general/constants'

/* A one-letter misspelling, owned so a scammer cannot buy it and send "organizer" mail from it. */
const LOOKALIKE_DOMAIN = 'pattersonsfamilyreunion.com'

const redirectedHosts = new Set([`www.${APP_DOMAIN}`, LOOKALIKE_DOMAIN, `www.${LOOKALIKE_DOMAIN}`])

/* Each host is its own Railway custom domain, so it gets a certificate and answers HTTPS; this sends
   it on to the bare domain. `www` was a Namecheap URL Redirect, which answered only plain http — an
   https://www link hung — and dropped the path, so www…/register landed on the home page.

   301, path and query kept. Any other Host passes through untouched. Ahead of the session handler,
   so a redirected request never reaches Better Auth, whose cookies and BETTER_AUTH_URL name the bare
   domain; after securityHeaders, so the redirect carries HSTS. */
export const canonicalHostRedirect: Handle = async ({ event, resolve }) => {
    if (!redirectedHosts.has(event.url.hostname)) {
        return resolve(event)
    }
    return new Response(undefined, {
        status: 301,
        headers: { location: `https://${APP_DOMAIN}${event.url.pathname}${event.url.search}` },
    })
}
