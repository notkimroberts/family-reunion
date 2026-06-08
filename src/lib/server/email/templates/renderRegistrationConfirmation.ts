import { APP_NAME } from '$lib/general/constants'

/* Returns subject and plain-text body confirming a paid event registration with party members and the management link. */
export function renderRegistrationConfirmation(data: {
    name: string
    eventTitle: string
    partyMembers: string[]
    totalAmount: string
    manageUrl: string
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
            'Manage your registration (add members, edit, or cancel):',
            data.manageUrl,
            '',
            'See you at the reunion!',
            `— ${APP_NAME} Team`,
        ].join('\n'),
    }
}
