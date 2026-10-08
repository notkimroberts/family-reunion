import type { Handle } from '@sveltejs/kit'
import { dev } from '$app/environment'

/* Headers set on every response. Not a full CSP — a script policy has to list every source (Sentry,
   the map embed, Stripe) and a miss breaks a page silently; see LAUNCH_CHECKLIST section 12.

   - frame-ancestors / X-Frame-Options: no other site may frame ours. A scam page wrapping the real
     site is a convincing fake; X-Frame-Options covers browsers too old for frame-ancestors, and many
     of our visitors are on old devices.
   - nosniff: the photo proxy serves user-contributed bytes; the browser must trust the content type.
   - Referrer-Policy: other sites see our origin, never a path or query string. */
const securityHeadersValue = {
    'Content-Security-Policy': "frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/* HSTS: once seen, the browser refuses plain http for the year, so hotel or café wifi cannot
   downgrade a visit. Off in dev, where the origin is http://localhost. No `preload`: that list is
   hard to leave, and the domain is still moving. */
const HSTS_VALUE = 'max-age=31536000'

export const securityHeaders: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)
    Object.entries(securityHeadersValue).forEach(([name, value]) => {
        response.headers.set(name, value)
    })
    if (!dev) {
        response.headers.set('Strict-Transport-Security', HSTS_VALUE)
    }
    return response
}
