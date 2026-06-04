import { Resend } from 'resend'
import { env } from '$env/dynamic/private'
import { APP_NAME, APP_DOMAIN } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'

// Returns a Resend client if RESEND_API_KEY is set, null otherwise (email silently skipped).
export function getResend(): Resend | null {
    if (!env.RESEND_API_KEY) {
        dbg.email('RESEND_API_KEY not set, email will be skipped')
        return null
    }
    return new Resend(env.RESEND_API_KEY)
}

// Sends a plain-text email via Resend using the app's noreply address; no-ops if client is unavailable.
export async function send(to: string, subject: string, text: string): Promise<void> {
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({ from: `${APP_NAME} <noreply@${APP_DOMAIN}>`, to, subject, text })
}
