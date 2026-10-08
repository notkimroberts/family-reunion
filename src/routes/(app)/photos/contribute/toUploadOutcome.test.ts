import { describe, expect, it } from 'vitest'
import { toUploadOutcome } from './toUploadOutcome'

describe('toUploadOutcome', () => {
    it('reads an accepted photo as ok', () => {
        expect(
            toUploadOutcome(200, { type: 'success', status: 200, data: { accepted: 1 } }),
        ).toEqual({ ok: true })
    })

    it('passes the action’s own message through, and does not offer a retry for a 400', () => {
        expect(
            toUploadOutcome(400, {
                type: 'failure',
                status: 400,
                data: { message: '"a.jpg" is larger than 15 MB.' },
            }),
        ).toEqual({ ok: false, message: '"a.jpg" is larger than 15 MB.', retryable: false })
    })

    it('offers a retry when the hourly limit refused it', () => {
        expect(
            toUploadOutcome(429, { type: 'failure', status: 429, data: { message: 'Later.' } }),
        ).toMatchObject({ ok: false, retryable: true })
    })

    /* adapter-node's BODY_SIZE_LIMIT answers before the action runs, as a SvelteKit error result. */
    it('reads a 413 as too large and not worth resending', () => {
        expect(
            toUploadOutcome(413, { type: 'error', status: 413, error: { message: 'too big' } }),
        ).toEqual({ ok: false, message: 'This photo is too large to send.', retryable: false })
    })

    it('reads a non-action reply as too large when it is a 413', () => {
        expect(toUploadOutcome(413, undefined)).toMatchObject({ ok: false, retryable: false })
    })

    it('offers a retry when the connection dropped', () => {
        expect(toUploadOutcome(0, undefined)).toMatchObject({ ok: false, retryable: true })
    })

    it('offers a retry on a server error', () => {
        expect(
            toUploadOutcome(500, { type: 'error', status: 500, error: { message: 'boom' } }),
        ).toMatchObject({ ok: false, retryable: true })
    })
})
