import * as Sentry from '@sentry/sveltekit'
import { SENTRY_DSN } from '$lib/general/constants'

Sentry.init({
    dsn: SENTRY_DSN,

    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,

    tracesSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: import.meta.env.DEV,
})
