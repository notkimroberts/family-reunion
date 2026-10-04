import type { RateLimitResult } from './RateLimitResult'

/* In-memory, per-key fixed-window rate limiter.

   SCOPE, so nobody mistakes it for more than it is. It holds counts in the process, so it resets on
   deploy and does not coordinate across instances. That is honest for this app — Railway runs one
   container — but if a second replica is ever added, this becomes per-replica and the effective
   limit doubles. It also cannot stop a distributed flood; it stops one person, or one script.

   Keyed by IP, it needs ADDRESS_HEADER and XFF_DEPTH set in production, or every visitor arrives as
   Railway's proxy and shares one window. */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
    const windows = new Map<string, { count: number; resetAt: number }>()

    /* Drops windows that have expired. Called on each check, so the map cannot grow without bound
       from one-off visitors — there is no background timer to leak. */
    function evictExpired(now: number): void {
        for (const [key, window] of windows) {
            if (window.resetAt <= now) {
                windows.delete(key)
            }
        }
    }

    return {
        /* Counts `count` against `key` and allows it only if the whole amount fits in the window. */
        check(key: string, count = 1): RateLimitResult {
            const now = Date.now()
            evictExpired(now)

            const window = windows.get(key) ?? { count: 0, resetAt: now + windowMs }

            if (window.count + count > max) {
                return {
                    allowed: false,
                    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
                }
            }

            window.count += count
            windows.set(key, window)
            return { allowed: true, retryAfterSeconds: 0 }
        },
        /* Test seam only. */
        reset(): void {
            windows.clear()
        },
    }
}
