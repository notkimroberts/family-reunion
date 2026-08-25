import * as Sentry from '@sentry/sveltekit'
import { SENTRY_DSN } from '$lib/general/constants'

Sentry.init({
    dsn: SENTRY_DSN,

    /* Matches hooks.client.ts. Without this the server reported from local dev too, so a
       hot-reload CompileError on a developer's machine landed in the production project as an
       unresolved issue — noise that would bury a real bounce or crash while watching a launch.
       Dev errors belong in the terminal, which already shows them. */
    enabled: import.meta.env.PROD,

    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,

    tracesSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: import.meta.env.DEV,
})
