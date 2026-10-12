import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/* Sentry's security endpoint, built from SENTRY_DSN (a .ts constant this file cannot import).
   contentSecurityPolicy.test.ts fails if the two drift apart. */
const SENTRY_CSP_REPORT_URI =
    'https://o4506248569946112.ingest.us.sentry.io/api/4511474410061824/security/?sentry_key=44700b1cf399333eea0d49e221aee58c&sentry_environment=production'

/* Report-only: the browser blocks nothing and reports every load the list does not name. A miss in
   an enforced policy breaks part of a page with no visible error, so this runs in production for two
   weeks first (LAUNCH_CHECKLIST section 12). frame-ancestors stays in securityHeaders, where it is
   enforced.

   - script-src 'self': SvelteKit adds a nonce for its inline hydration script (mode 'auto').
   - style-src 'unsafe-inline': SSR style="" attributes, app.html's included. With it, SvelteKit adds
     no style nonce, which would otherwise make the browser ignore 'unsafe-inline'.
   - worker-src blob:: Sentry session replay compresses in a worker built from a blob.
   - frame-src: the Google My Maps embed (MAP_EMBED_URL).
   - form-action Stripe: /register and /donate answer with a 303 to Checkout. When the form posts
     natively (JavaScript not loaded), the browser checks that redirect against form-action. */
/** @type {NonNullable<import('@sveltejs/kit').KitConfig['csp']>['reportOnly']} */
const cspReportOnlyValue = {
    'default-src': ['self'],
    'script-src': ['self'],
    'style-src': ['self', 'unsafe-inline'],
    'img-src': ['self', 'data:'],
    'connect-src': ['self', 'https://o4506248569946112.ingest.us.sentry.io'],
    'worker-src': ['self', 'blob:'],
    'frame-src': ['https://www.google.com'],
    'form-action': ['self', 'https://checkout.stripe.com'],
    'base-uri': ['self'],
    'object-src': ['none'],
    'report-uri': [SENTRY_CSP_REPORT_URI],
}

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
