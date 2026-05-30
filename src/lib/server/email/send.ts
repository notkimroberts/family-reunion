import { Resend } from 'resend'
import { env } from '$env/dynamic/private'
import { APP_NAME, APP_DOMAIN } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'
import {
    renderMagicLinkEmail,
    renderContactEmail,
    renderRegistrationConfirmation,
} from './templates'

function getResend(): Resend | null {
    if (!env.RESEND_API_KEY) {
        dbg.email('RESEND_API_KEY not set, email will be skipped')
        return null
    }
    return new Resend(env.RESEND_API_KEY)
}

async function send(to: string, subject: string, text: string): Promise<void> {
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({ from: `${APP_NAME} <noreply@${APP_DOMAIN}>`, to, subject, text })
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
    dbg.email('sendMagicLinkEmail to=%s', to)
    const { subject, text } = renderMagicLinkEmail(url)
    await send(to, subject, text)
}

export async function sendContactEmail(
    from: { name: string; email: string },
    message: string,
): Promise<void> {
    dbg.email('sendContactEmail from=%s', from.email)
    const { subject, text } = renderContactEmail(from, message)
    await send(env.ADMIN_EMAIL!, subject, text)
}

export async function sendRegistrationConfirmation(
    to: string,
    data: { name: string; eventTitle: string; partyMembers: string[]; totalAmount: string },
): Promise<void> {
    dbg.email(
        'sendRegistrationConfirmation to=%s event=%s members=%d',
        to,
        data.eventTitle,
        data.partyMembers.length,
    )
    const { subject, text } = renderRegistrationConfirmation(data)
    await send(to, subject, text)
}
