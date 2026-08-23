import { Resend } from 'resend'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { APP_NAME, APP_DOMAIN } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'

/* Returns a Resend client, or undefined in dev when no key is configured so local work
   doesn't need one. In production a missing key throws instead of skipping: callers commit
   state on the assumption the mail was delivered (see the token rotation in
   /register/recover), so a silent skip locks registrants out of their own registration. */
function getResend(): Resend | undefined {
    if (!env.RESEND_API_KEY) {
        if (dev) {
            dbg.email('RESEND_API_KEY not set, skipping email in dev')
            return undefined
        }
        throw new Error('RESEND_API_KEY is not set — refusing to silently skip email')
    }
    return new Resend(env.RESEND_API_KEY)
}

/* Sends an email via Resend using the app's noreply address. Throws when Resend reports a
   failure: the SDK resolves with { data, error } and never rejects, so awaiting it without
   inspecting `error` treats every API failure — unverified domain, rate limit, rejected
   address — as success.

   idempotencyKey (format `<event-type>/<entity-id>`, 24h window) makes a retried send
   return the original response instead of delivering a second copy. */
export async function send(params: {
    to: string
    subject: string
    text: string
    html?: string
    idempotencyKey?: string
}): Promise<void> {
    const resend = getResend()
    if (!resend) {
        return
    }

    const { error } = await resend.emails.send(
        {
            from: `${APP_NAME} <noreply@${APP_DOMAIN}>`,
            to: params.to,
            subject: params.subject,
            text: params.text,
            ...(params.html ? { html: params.html } : {}),
        },
        params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    )

    if (error) {
        dbg.email('send failed to=%s: %o', params.to, error)
        throw new Error(`Resend rejected the email to ${params.to}: ${error.message}`)
    }
}
