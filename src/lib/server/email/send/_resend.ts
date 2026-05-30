import { Resend } from 'resend'
import { env } from '$env/dynamic/private'
import { APP_NAME, APP_DOMAIN } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'

export function getResend(): Resend | null {
    if (!env.RESEND_API_KEY) {
        dbg.email('RESEND_API_KEY not set, email will be skipped')
        return null
    }
    return new Resend(env.RESEND_API_KEY)
}

export async function send(to: string, subject: string, text: string): Promise<void> {
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({ from: `${APP_NAME} <noreply@${APP_DOMAIN}>`, to, subject, text })
}
