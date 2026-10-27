import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAP_EMBED_URL, SENTRY_DSN } from '$lib/general/constants'
import config from '../../../svelte.config.js'

const reportOnly = config.kit?.csp?.reportOnly ?? {}
const dsn = new URL(SENTRY_DSN)

/* The config reads SENTRY_ENVIRONMENT when it loads, so each case loads a fresh copy. */
async function reportEnvironmentFor(sentryEnvironment: string) {
    vi.stubEnv('SENTRY_ENVIRONMENT', sentryEnvironment)
    vi.resetModules()
    const { default: freshConfig } = await import('../../../svelte.config.js')
    const reportUri = new URL(freshConfig.kit?.csp?.reportOnly?.['report-uri']?.[0] ?? '')
    return reportUri.searchParams.get('sentry_environment')
}

/* Each source a page needs and a policy could forget. A miss is silent once the policy enforces. */
describe('report-only Content Security Policy', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('reports to the Sentry project SENTRY_DSN names', () => {
        const reportUri = new URL(reportOnly['report-uri']?.[0] ?? '')

        expect(reportUri.origin).toBe(dsn.origin)
        expect(reportUri.pathname).toBe(`/api${dsn.pathname}/security/`)
        expect(reportUri.searchParams.get('sentry_key')).toBe(dsn.username)
    })

    /* A local build must not file its violations beside production's. */
    it('files reports under SENTRY_ENVIRONMENT', async () => {
        expect(await reportEnvironmentFor('development')).toBe('development')
        expect(await reportEnvironmentFor('production')).toBe('production')
    })

    it('files reports under production when SENTRY_ENVIRONMENT is empty', async () => {
        expect(await reportEnvironmentFor('')).toBe('production')
    })

    it('lets the browser send errors and replays to Sentry', () => {
        expect(reportOnly['connect-src']).toContain(dsn.origin)
        expect(reportOnly['worker-src']).toContain('blob:')
    })

    it('lets Umami load its script and send events', () => {
        expect(reportOnly['script-src']).toContain('https://cloud.umami.is')
        expect(reportOnly['connect-src']).toContain('https://gateway.umami.is')
        expect(reportOnly['connect-src']).toContain('https://api-gateway.umami.dev')
    })

    it('lets the program page frame the map', () => {
        expect(reportOnly['frame-src']).toContain(new URL(MAP_EMBED_URL).origin)
    })

    it('lets a native form post redirect to Stripe Checkout', () => {
        expect(reportOnly['form-action']).toContain('https://checkout.stripe.com')
    })
})
