import { Resend } from 'resend'
import { env } from '$env/dynamic/private'

/* The event union is not exported from the resend package, so derive it from the method. */
type ResendWebhookEvent = ReturnType<Resend['webhooks']['verify']>

type VerifyResult =
    | { ok: true; event: ResendWebhookEvent }
    | { ok: false; reason: 'unconfigured' | 'missing_headers' | 'invalid_signature' }

/* Verifies a Resend webhook signature and returns the parsed event.

   Webhooks are unauthenticated POSTs — anyone who learns the URL can forge one — so an
   unverified payload must never be processed.

   Three details differ from both the send API and Resend's published snippet:
   - verify() is synchronous and THROWS on a bad signature, rather than returning
     { data, error } the way the send API does.
   - The option is named `webhookSecret`, not `secret`.
   - `headers` is NOT a Web API Headers object. This SDK wants the svix header *values* as
     { id, timestamp, signature }. Passing a Headers instance type-errors, and following the
     published example would silently reject every webhook.

   The three failure reasons are distinguished so the caller can tell a deployment mistake
   (needs an operator) from a request that was never Resend's, from a forged or stale one.

   Uses its own client because verification is pure crypto over the payload and the signing
   secret — it must work even when RESEND_API_KEY is absent. */
export function verifyWebhookEvent(params: { payload: string; headers: Headers }): VerifyResult {
    const webhookSecret = env.RESEND_WEBHOOK_SECRET
    if (!webhookSecret) {
        return { ok: false, reason: 'unconfigured' }
    }

    const id = params.headers.get('svix-id')
    const timestamp = params.headers.get('svix-timestamp')
    const signature = params.headers.get('svix-signature')
    if (!id || !timestamp || !signature) {
        return { ok: false, reason: 'missing_headers' }
    }

    try {
        const event = new Resend(env.RESEND_API_KEY).webhooks.verify({
            payload: params.payload,
            headers: { id, timestamp, signature },
            webhookSecret,
        })
        return { ok: true, event }
    } catch {
        return { ok: false, reason: 'invalid_signature' }
    }
}
