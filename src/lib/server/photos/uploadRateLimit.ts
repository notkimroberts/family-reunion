/* In-memory, per-IP fixed-window rate limiter for the credential-free upload endpoint.

   SCOPE, so nobody mistakes it for more than it is. It holds counts in the process, so it resets on
   deploy and does not coordinate across instances. That is honest for this app — Railway runs one
   container — but if a second replica is ever added, this becomes per-replica and the effective
   limit doubles. It also cannot stop a distributed flood; it stops one person, or one script, from
   filling the bucket in an afternoon.

   It is here because upload carries no credential, so there is no account to suspend and no token to
   revoke. Combined with review-before-publish, the worst a flood achieves is a long moderation queue
   and a storage bill, not anything served to the public. */

const WINDOW_MS = 60 * 60 * 1000
const MAX_UPLOADS_PER_WINDOW = 40

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

/* Drops windows that have expired. Called on each check, so the map cannot grow without bound from
   one-off visitors — there is no background timer to leak. */
function evictExpired(now: number): void {
    for (const [key, window] of windows) {
        if (window.resetAt <= now) {
            windows.delete(key)
        }
    }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

export function checkUploadRateLimit(clientAddress: string, count = 1): RateLimitResult {
    const now = Date.now()
    evictExpired(now)

    const existing = windows.get(clientAddress)
    const window = existing ?? { count: 0, resetAt: now + WINDOW_MS }

    if (window.count + count > MAX_UPLOADS_PER_WINDOW) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
        }
    }

    window.count += count
    windows.set(clientAddress, window)
    return { allowed: true, retryAfterSeconds: 0 }
}

/* Test seam only. */
export function resetUploadRateLimits(): void {
    windows.clear()
}
