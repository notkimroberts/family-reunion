import { APP_NAME } from '$lib/general/constants'

// Returns subject and plain-text body for an inbound contact-form message forwarded to admins.
export function renderContactEmail(
    from: { name: string; email: string },
    message: string,
): { subject: string; text: string } {
    return {
        subject: `Contact Form: ${from.name}`,
        text: `From: ${from.name} (${from.email})\n\n${message}`,
    }
}
