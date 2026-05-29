import { Resend } from 'resend'
import { env } from '$env/dynamic/private'
import { APP_NAME, APP_DOMAIN } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'

function getResend() {
    if (!env.RESEND_API_KEY) {
        dbg.email('RESEND_API_KEY not set, email will be skipped')
        return null
    }
    return new Resend(env.RESEND_API_KEY)
}

export async function sendMagicLinkEmail(to: string, url: string) {
    dbg.email('sendMagicLinkEmail to=%s', to)
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({
        from: `${APP_NAME} <noreply@${APP_DOMAIN}>`,
        to,
        subject: `Your sign-in link for ${APP_NAME}`,
        text: [
            `Click the link below to sign in to ${APP_NAME}:`,
            '',
            url,
            '',
            'This link expires in 5 minutes.',
            '',
            "If you didn't request this, you can safely ignore this email.",
        ].join('\n'),
    })
}

export async function sendContactEmail(from: { name: string; email: string }, message: string) {
    dbg.email('sendContactEmail from=%s', from.email)
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({
        from: `${APP_NAME} <noreply@${APP_DOMAIN}>`,
        to: env.ADMIN_EMAIL!,
        subject: `Contact Form: ${from.name}`,
        text: `From: ${from.name} (${from.email})\n\n${message}`,
    })
}

export async function sendRegistrationConfirmation(
    to: string,
    data: { name: string; eventTitle: string; partyMembers: string[]; totalAmount: string },
) {
    dbg.email(
        'sendRegistrationConfirmation to=%s event=%s members=%d',
        to,
        data.eventTitle,
        data.partyMembers.length,
    )
    const resend = getResend()
    if (!resend) {
        return
    }
    await resend.emails.send({
        from: `${APP_NAME} <noreply@${APP_DOMAIN}>`,
        to,
        subject: `Registration Confirmed: ${data.eventTitle}`,
        text: [
            `Hi ${data.name},`,
            '',
            `Your registration for ${data.eventTitle} is confirmed!`,
            '',
            'Party members:',
            ...data.partyMembers.map((m) => `  - ${m}`),
            '',
            `Total paid: ${data.totalAmount}`,
            '',
            'See you at the reunion!',
            `— ${APP_NAME} Team`,
        ].join('\n'),
    })
}
