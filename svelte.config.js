import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { loadEnv } from 'vite'

/* Same source as Sentry.init's environment (vite.config.ts), so a local build's reports are not
   filed as production. Mode 'production': only a build sends reports — securityHeaders strips
   report-uri in dev. */
const sentryEnvironment =
    loadEnv('production', process.cwd(), '').SENTRY_ENVIRONMENT || 'production'

/* Sentry's security endpoint, built from SENTRY_DSN (a .ts constant this file cannot import).
   contentSecurityPolicy.test.ts fails if the two drift apart. */
const SENTRY_CSP_REPORT_URI = `https://o4506248569946112.ingest.us.sentry.io/api/4511474410061824/security/?sentry_key=44700b1cf399333eea0d49e221aee58c&sentry_environment=${encodeURIComponent(sentryEnvironment)}`

/* Report-only: the browser blocks nothing and reports every load the list does not name. A miss in
   an enforced policy breaks part of a page with no visible error, so this runs in production for two
   weeks first (LAUNCH_CHECKLIST section 12). frame-ancestors stays in securityHeaders, where it is
   enforced.

   - script-src 'self': SvelteKit adds a nonce for its inline hydration script (mode 'auto').
   - style-src 'unsafe-inline': SSR style="" attributes, app.html's included. With it, SvelteKit adds
     no style nonce, which would otherwise make the browser ignore 'unsafe-inline'.
   - Umami: script from cloud.umami.is; Umami Cloud sends events to gateway.umami.is (seen in
     production CSP reports) and api-gateway.umami.dev.
   - worker-src blob:: Sentry session replay compresses in a worker built from a blob.
   - frame-src: the Google My Maps embed (MAP_EMBED_URL).
   - form-action Stripe: /register and /donate answer with a 303 to Checkout. When the form posts
     natively (JavaScript not loaded), the browser checks that redirect against form-action. */
/** @type {NonNullable<import('@sveltejs/kit').KitConfig['csp']>['reportOnly']} */
const cspReportOnlyValue = {
    'default-src': ['self'],
    'script-src': ['self', 'https://cloud.umami.is'],
    'style-src': ['self', 'unsafe-inline'],
    'img-src': ['self', 'data:'],
    'connect-src': [
        'self',
        'https://o4506248569946112.ingest.us.sentry.io',
        'https://cloud.umami.is',
        'https://gateway.umami.is',
        'https://api-gateway.umami.dev',
    ],
    'worker-src': ['self', 'blob:'],
    'frame-src': ['https://www.google.com'],
    'form-action': ['self', 'https://checkout.stripe.com'],
    'base-uri': ['self'],
    'object-src': ['none'],
    'report-uri': [SENTRY_CSP_REPORT_URI],
}

const VERSION_POLL_INTERVAL_MS = 5 * 60 * 1000

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    compilerOptions: {
        experimental: {
            async: true,
        },
    },
    kit: {
        adapter: adapter(),

        csp: {
            mode: 'auto',
            reportOnly: cspReportOnlyValue,
        },

        /* Off by default in this SvelteKit, so a tab left open across a deploy never learned of it
           until a load failed. With it, +layout.svelte's beforeNavigate reloads that tab instead. */
        version: {
            pollInterval: VERSION_POLL_INTERVAL_MS,
        },

        experimental: {
            remoteFunctions: true,
            tracing: {
                server: true,
            },

            instrumentation: {
                server: true,
            },
        },
    },
}

export default config
