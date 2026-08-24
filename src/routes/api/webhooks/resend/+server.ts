import { dbg } from '$lib/server/debug'
import { verifyWebhookEvent } from '$lib/server/email'
import { getRegistrationsByEmail } from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import type { RequestHandler } from './$types'

/* Resend delivery webhook.

   Exists because a bounce or spam complaint means the registrant never received their
   management link, and nothing else in the system would ever notice: the confirmation is a
   single un-retried attempt, since the conditional pending → paid transition stops a Stripe
   redelivery from sending it again.

   Must stay reachable without a session — Resend sends no cookies. It sits outside the (app)
   route group, so the admin route lock does not apply; see isPublicPath's notes.

   Always answers 200 for a verified event so Resend does not retry something already recorded. */
export const POST: RequestHandler = async ({ request }) => {
    /* Raw text, not json(): the signature is computed over the exact bytes received. */
    const payload = await request.text()
    const result = verifyWebhookEvent({ payload, headers: request.headers })

    if (!result.ok) {
        if (result.reason === 'unconfigured') {
            /* A deployment mistake, not a bad actor: the endpoint is registered with Resend but
               RESEND_WEBHOOK_SECRET is missing, so every delivery failure is being dropped. */
            reportError(
                'resend webhook received but RESEND_WEBHOOK_SECRET is not set',
                new Error('RESEND_WEBHOOK_SECRET missing'),
            )
            return new Response('Webhook not configured', { status: 500 })
        }
        dbg.email('resend webhook rejected: %s', result.reason)
        return new Response('Invalid signature', { status: 400 })
    }

    const { event } = result
    dbg.email('resend webhook event type=%s', event.type)

    /* Narrow on the discriminant rather than an array membership test, so `event.data` is known
       to carry email fields — the union also includes contact and domain events, which have no
       recipient at all. */
    if (
        event.type !== 'email.bounced' &&
        event.type !== 'email.complained' &&
        event.type !== 'email.failed'
    ) {
        return new Response('OK', { status: 200 })
    }

    const detail =
        event.type === 'email.bounced'
            ? `${event.data.bounce.type}/${event.data.bounce.subType}: ${event.data.bounce.message}`
            : event.type === 'email.failed'
              ? event.data.failed.reason
              : undefined

    /* `to` is an array; a confirmation only ever has one recipient, but handle the general case. */
    for (const recipient of event.data.to) {
        /* Contact emails are stored lowercased by the registration schema, so normalise before
           matching or a differently-cased recipient would silently find nothing. */
        const matches = await getRegistrationsByEmail(recipient.trim().toLowerCase())

        reportError(`resend ${event.type}`, new Error(`${event.type} for ${recipient}`), {
            recipient,
            emailId: event.data.email_id,
            subject: event.data.subject,
            detail: detail ?? null,
            /* Name the affected registrations so an organiser can act rather than guess. */
            registrationIds: matches.map((match) => match.id).join(',') || 'none',
        })
    }

    return new Response('OK', { status: 200 })
}
