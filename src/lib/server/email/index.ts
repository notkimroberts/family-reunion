import { Resend } from 'resend'
import { env } from '$env/dynamic/private'
import { APP_NAME } from '$lib/general/constants'
import { dbg } from '$lib/server/debug'

function getResend() {
    return new Resend(env.RESEND_API_KEY)
}

export async function sendContactEmail(from: { name: string; email: string }, message: string) {
    dbg.email('sendContactEmail from=%s', from.email)
    await getResend().emails.send({
        from: `${APP_NAME} <noreply@resend.dev>`,
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
    await getResend().emails.send({
        from: `${APP_NAME} <noreply@resend.dev>`,
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
