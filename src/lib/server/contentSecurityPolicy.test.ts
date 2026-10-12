import { describe, expect, it } from 'vitest'
import { MAP_EMBED_URL, SENTRY_DSN } from '$lib/general/constants'
import config from '../../../svelte.config.js'

const reportOnly = config.kit?.csp?.reportOnly ?? {}
const dsn = new URL(SENTRY_DSN)

/* Each source a page needs and a policy could forget. A miss is silent once the policy enforces. */
describe('report-only Content Security Policy', () => {
    it('reports to the Sentry project SENTRY_DSN names', () => {
        const reportUri = new URL(reportOnly['report-uri']?.[0] ?? '')

        expect(reportUri.origin).toBe(dsn.origin)
        expect(reportUri.pathname).toBe(`/api${dsn.pathname}/security/`)
        expect(reportUri.searchParams.get('sentry_key')).toBe(dsn.username)
    })

    it('lets the browser send errors and replays to Sentry', () => {
        expect(reportOnly['connect-src']).toContain(dsn.origin)
        expect(reportOnly['worker-src']).toContain('blob:')
    })

    it('lets the program page frame the map', () => {
        expect(reportOnly['frame-src']).toContain(new URL(MAP_EMBED_URL).origin)
    })

    it('lets a native form post redirect to Stripe Checkout', () => {
        expect(reportOnly['form-action']).toContain('https://checkout.stripe.com')
    })
})
