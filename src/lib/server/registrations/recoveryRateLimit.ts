import { createRateLimiter } from '$lib/server/rateLimit'

/* Limits on /register/recover, which emails a fresh view link to any registered address.

   Unlimited, anyone could flood a registrant with "your registration link" mail — and every send
   rotates the token, so a flood also keeps killing the link the registrant already holds. Per email
   stops that for one inbox; per IP stops one script walking a list of addresses. */

const WINDOW_MS = 60 * 60 * 1000
const MAX_EMAILS_PER_ADDRESS = 3
const MAX_REQUESTS_PER_IP = 20

const byEmail = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_EMAILS_PER_ADDRESS })
const byClientAddress = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS_PER_IP })

/* True when this request may send. `email` arrives lowercased by recoverSchema, so case variants
   share one window. Checked before the registration lookup, so a refusal looks the same whether or
   not the address is registered. */
export function allowRecoveryRequest(email: string, clientAddress: string): boolean {
    return byClientAddress.check(clientAddress).allowed && byEmail.check(email).allowed
}

/* Test seam only. */
export function resetRecoveryRateLimits(): void {
    byEmail.reset()
    byClientAddress.reset()
}
