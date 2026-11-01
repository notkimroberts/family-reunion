import { Resend } from 'resend'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { CONTACT_EMAIL, EMAIL_FROM_ADDRESS, REUNION_NAME } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'
import { writeToOutbox } from './_writeToOutbox'

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

/* Sends an email via Resend from the reunion's address, with replies routed to a human. Throws when
   Resend reports a failure: the SDK resolves with { data, error } and never rejects, so awaiting it
   without inspecting `error` treats every API failure — unverified domain, rate limit, rejected
   address — as success.

   replyTo is what makes the templates' "Questions? Reply to this email" true. The From address is on
   APP_DOMAIN because that is the domain verified in Resend and DKIM/SPF have to align on it; where
   replies land is a separate decision, and this header keeps it one (see CONTACT_EMAIL). The SDK takes camelCase `replyTo` and serializes it to `reply_to`; passing `reply_to`
   directly is silently ignored.

   idempotencyKey (format `<event-type>/<entity-id>`, 24h window) makes a retried send
   return the original response instead of delivering a second copy. */
export async function send(params: {
    to: string
    subject: string
    text: string
    html?: string
    idempotencyKey?: string
}): Promise<void> {
    const from = `${REUNION_NAME} <${EMAIL_FROM_ADDRESS}>`
    /* The end-to-end tests' outbox. Checked first, so a test run needs no Resend key and sends
       nothing; see writeToOutbox for why Railway refuses it. */
    if (env.EMAIL_OUTBOX_DIR) {
        await writeToOutbox(
            env.EMAIL_OUTBOX_DIR,
            { from, replyTo: CONTACT_EMAIL, ...params },
            env.RAILWAY_ENVIRONMENT,
        )
        return
    }

    const resend = getResend()
    if (!resend) {
        return
    }

    const { error } = await resend.emails.send(
        {
            from,
            replyTo: CONTACT_EMAIL,
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

/* Resend's ceiling on one batch call. */
export const BATCH_SIZE_LIMIT = 100

/* Sends up to BATCH_SIZE_LIMIT emails in one call, with the same From, Reply-To, outbox and
   throw-on-error contract as send(). Resend validates a batch strictly by default, so one rejected
   address fails the whole call and none of it is delivered — which is what lets a retry under the
   same idempotencyKey resend the batch as a unit. */
export async function sendBatch(
    messages: { to: string; subject: string; text: string; html: string }[],
    idempotencyKey: string,
): Promise<void> {
    if (messages.length > BATCH_SIZE_LIMIT) {
        throw new Error(`A batch holds at most ${BATCH_SIZE_LIMIT} emails, got ${messages.length}`)
    }
    const from = `${REUNION_NAME} <${EMAIL_FROM_ADDRESS}>`
    if (env.EMAIL_OUTBOX_DIR) {
        for (const message of messages) {
            await writeToOutbox(
                env.EMAIL_OUTBOX_DIR,
                { from, replyTo: CONTACT_EMAIL, idempotencyKey, ...message },
                env.RAILWAY_ENVIRONMENT,
            )
        }
        return
    }

    const resend = getResend()
    if (!resend) {
        return
    }

    const { error } = await resend.batch.send(
        messages.map((message) => ({ from, replyTo: CONTACT_EMAIL, ...message })),
        { idempotencyKey },
    )

    if (error) {
        dbg.email('batch send failed key=%s: %o', idempotencyKey, error)
        throw new Error(`Resend rejected the batch ${idempotencyKey}: ${error.message}`)
    }
}
