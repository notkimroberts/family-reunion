import type { Handle } from '@sveltejs/kit'
import { dev } from '$app/environment'

/* Headers set on every response. The enforced CSP is frame-ancestors only. The full policy is
   report-only, in svelte.config.js, because SvelteKit must add a nonce for its own inline script.

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

const REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only'

/* Dev keeps the policy, so the console still names a violation, but sends Sentry nothing — as
   hooks.client.ts does. svelte.config.js has no `dev` flag to check. */
function withoutReportUri(policy: string) {
    return policy
        .split(';')
        .filter((directive) => !directive.trim().startsWith('report-uri'))
        .join(';')
}

export const securityHeaders: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)
    Object.entries(securityHeadersValue).forEach(([name, value]) => {
        response.headers.set(name, value)
    })
    if (!dev) {
        response.headers.set('Strict-Transport-Security', HSTS_VALUE)
    }
    const reportOnlyPolicy = response.headers.get(REPORT_ONLY_HEADER)
    if (dev && reportOnlyPolicy) {
        response.headers.set(REPORT_ONLY_HEADER, withoutReportUri(reportOnlyPolicy))
    }
    return response
}
