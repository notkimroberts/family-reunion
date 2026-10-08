import type { ActionResult } from '@sveltejs/kit'
import type { PhotoUploadOutcome } from './types'

const PAYLOAD_TOO_LARGE = 413
const TOO_MANY_REQUESTS = 429
const NETWORK_FAILURE = 0

/* Reads one upload's response as an outcome the batch can act on. `result` is undefined when the
   body was not an action result at all: a dropped connection, or a proxy's own error page.

   413 is checked first. adapter-node refuses an oversized body before the action runs, so its reply
   is a SvelteKit error, not the action's friendly fail() — and resending the same bytes cannot work.
   A 429 is the hourly upload limit, which a later retry can pass. A 400 is the action refusing the
   file itself, which it will refuse again. */
export function toUploadOutcome(
    status: number,
    result: ActionResult | undefined,
): PhotoUploadOutcome {
    if (result?.type === 'success') {
        return { ok: true }
    }
    if (status === PAYLOAD_TOO_LARGE) {
        return { ok: false, message: 'This photo is too large to send.', retryable: false }
    }
    if (result?.type === 'failure') {
        const message = result.data?.message
        return {
            ok: false,
            message: typeof message === 'string' ? message : 'This photo was not accepted.',
            retryable: status === TOO_MANY_REQUESTS,
        }
    }
    if (status === NETWORK_FAILURE) {
        return {
            ok: false,
            message: 'The connection dropped before this photo was sent.',
            retryable: true,
        }
    }
    return { ok: false, message: 'Something went wrong sending this photo.', retryable: true }
}
