import { beforeEach, describe, expect, it } from 'vitest'
import { checkUploadRateLimit, resetUploadRateLimits } from './uploadRateLimit'

/* The upload endpoint has no credential, so there is no account to suspend and no token to revoke.
   This limiter is the only throttle that exists — see ADR 0009. */

beforeEach(() => {
    resetUploadRateLimits()
})

describe('checkUploadRateLimit', () => {
    it('allows an ordinary contribution', () => {
        expect(checkUploadRateLimit('203.0.113.1', 5).allowed).toBe(true)
    })

    it('refuses once one address exceeds the window, and says when to come back', () => {
        checkUploadRateLimit('203.0.113.1', 40)

        const result = checkUploadRateLimit('203.0.113.1', 1)

        expect(result.allowed).toBe(false)
        expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('counts the whole batch, not the request — ten files is ten uploads', () => {
        for (let i = 0; i < 4; i += 1) {
            expect(checkUploadRateLimit('203.0.113.2', 10).allowed).toBe(true)
        }

        expect(checkUploadRateLimit('203.0.113.2', 1).allowed).toBe(false)
    })

    it('refuses a single batch that would exceed the limit outright', () => {
        expect(checkUploadRateLimit('203.0.113.3', 500).allowed).toBe(false)
        /* And a refused batch is not counted, so it cannot lock out a later honest upload. */
        expect(checkUploadRateLimit('203.0.113.3', 1).allowed).toBe(true)
    })

    it('does not let one address exhaust another address', () => {
        checkUploadRateLimit('203.0.113.4', 40)

        expect(checkUploadRateLimit('203.0.113.5', 1).allowed).toBe(true)
    })
})
