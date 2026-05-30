import { APP_NAME } from '$lib/general/constants'

export function renderMagicLinkEmail(url: string): { subject: string; text: string } {
    return {
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
    }
}

export function renderContactEmail(
    from: { name: string; email: string },
    message: string,
): { subject: string; text: string } {
    return {
        subject: `Contact Form: ${from.name}`,
        text: `From: ${from.name} (${from.email})\n\n${message}`,
    }
}

export function renderRegistrationConfirmation(data: {
    name: string
    eventTitle: string
    partyMembers: string[]
    totalAmount: string
}): { subject: string; text: string } {
    return {
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
    }
}
