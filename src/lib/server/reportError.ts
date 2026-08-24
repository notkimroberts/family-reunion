import * as Sentry from '@sentry/sveltekit'
import { dbg } from '$lib/server/debug'

/* Reports a swallowed error so it is visible in production.

   `dbg` alone is not enough: the debug package is only ever enabled by Debug.enable() in
   vite.config.ts, which runs at build time and not under `node build/index.js`, and DEBUG is
   not set in the Railway environment. So dbg.* writes nothing in production and a
   `catch { dbg(...) }` is an entirely silent failure.

   Use this at every catch that deliberately continues — cases where the operation must not be
   rolled back but somebody still needs to know it failed. */
export function reportError(
    message: string,
    error: unknown,
    context?: Record<string, string | number | null>,
): void {
    dbg.hooks('%s: %o %o', message, error, context ?? {})
    Sentry.captureException(error, {
        tags: { swallowed: 'true' },
        extra: { message, ...context },
    })
}
