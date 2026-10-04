import { createRateLimiter, type RateLimitResult } from '$lib/server/rateLimit'

/* Per-IP limit on the credential-free upload endpoint.

   It is here because upload carries no credential, so there is no account to suspend and no token to
   revoke. Combined with review-before-publish, the worst a flood achieves is a long moderation queue
   and a storage bill, not anything served to the public. See createRateLimiter for what an
   in-process limiter can and cannot do. */

const WINDOW_MS = 60 * 60 * 1000
const MAX_UPLOADS_PER_WINDOW = 40

const uploadLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_UPLOADS_PER_WINDOW })

export function checkUploadRateLimit(clientAddress: string, count = 1): RateLimitResult {
    return uploadLimiter.check(clientAddress, count)
}

/* Test seam only. */
export function resetUploadRateLimits(): void {
    uploadLimiter.reset()
}
