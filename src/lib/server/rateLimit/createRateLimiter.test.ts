import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './createRateLimiter'

describe('createRateLimiter', () => {
    it('allows up to max per key, then refuses with a retry time', () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })

        expect(limiter.check('a').allowed).toBe(true)
        expect(limiter.check('a').allowed).toBe(true)
        const refused = limiter.check('a')

        expect(refused.allowed).toBe(false)
        expect(refused.retryAfterSeconds).toBeGreaterThan(0)
        expect(limiter.check('b').allowed).toBe(true)
    })

    /* Each limiter owns its own windows: the recovery limit must not spend the upload budget. */
    it('keeps separate limiters independent', () => {
        const first = createRateLimiter({ windowMs: 60_000, max: 1 })
        const second = createRateLimiter({ windowMs: 60_000, max: 1 })

        first.check('a')

        expect(second.check('a').allowed).toBe(true)
    })
})
