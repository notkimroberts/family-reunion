import type { ActionResult } from '@sveltejs/kit'
import type { PhotoUploadOutcome } from './types'

const PAYLOAD_TOO_LARGE = 413
const TOO_MANY_REQUESTS = 429
const SERVER_ERROR = 500
const NETWORK_FAILURE = 0

/* Reads one upload's response as an outcome the batch can act on. `httpStatus` is the response's
   own status; `result` is undefined when the body was not an action result at all: a dropped
   connection, or a proxy's own error page.

   A fail() arrives as HTTP 200 with its real status INSIDE the result, so a failure is judged by
   `result.status`, never by the HTTP status — reading the HTTP one made every 429 and 503 look
   final and hid the retry button.

   413 is checked first. adapter-node refuses an oversized body before the action runs, so its reply
   is a SvelteKit error, not the action's friendly fail() — and resending the same bytes cannot work.
   A 429 is the hourly upload limit, and a 503 is the server failing to store a readable photo; a
   later retry can pass either. A 400 is the action refusing the file itself, which it will refuse
   again. */
export function toUploadOutcome(
    httpStatus: number,
    result: ActionResult | undefined,
): PhotoUploadOutcome {
    if (result?.type === 'success') {
        return { ok: true }
    }
    if (httpStatus === PAYLOAD_TOO_LARGE) {
        return { ok: false, message: 'This photo is too large to send.', retryable: false }
    }
    if (result?.type === 'failure') {
        const message = result.data?.message
        return {
            ok: false,
            message: typeof message === 'string' ? message : 'This photo was not accepted.',
            retryable: result.status === TOO_MANY_REQUESTS || result.status >= SERVER_ERROR,
        }
    }
    if (httpStatus === NETWORK_FAILURE) {
        return {
            ok: false,
            message: 'The connection dropped before this photo was sent.',
            retryable: true,
        }
    }
    return { ok: false, message: 'Something went wrong sending this photo.', retryable: true }
}
