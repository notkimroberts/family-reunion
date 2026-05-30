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
