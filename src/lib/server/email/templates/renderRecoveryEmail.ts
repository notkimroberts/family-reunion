import { APP_NAME } from '$lib/general/constants'

/* Returns subject and plain-text body for re-sending the management link to a registrant who lost the original email. */
export function renderRecoveryEmail(data: { eventTitle: string; manageUrl: string }): {
    subject: string
    text: string
} {
    return {
        subject: `Manage your ${data.eventTitle} registration`,
        text: [
            'Hi,',
            '',
            `Here is the link to manage your registration for ${data.eventTitle}:`,
            '',
            data.manageUrl,
            '',
            'Use this link to view your party, add or edit members, or cancel your registration.',
            '',
            `— ${APP_NAME} Team`,
        ].join('\n'),
    }
}
