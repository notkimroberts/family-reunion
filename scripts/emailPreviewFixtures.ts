import {
    renderCancellationEmail,
    renderDonationReceipt,
    renderRecoveryEmail,
    renderRegistrationConfirmation,
} from '../src/lib/server/email/templates'
import type {
    CancellationEmailData,
    RegistrationConfirmationData,
} from '../src/lib/server/email/templates'
import { formatDateRange } from '../src/lib/utils/formatDateRange'

type RenderedEmail = { subject: string; text: string; html: string }

/* Every variant a registrant or donor can receive, with realistic data. Imported from the templates
   folder directly, NOT $lib/server/email: that barrel pulls in send/, which needs $env and $app and
   cannot load outside SvelteKit.

   siteOrigin is what production takes from the request: it builds the links and the header image
   URL, so pass a domain that is actually serving the site or the image shows broken. */
export function emailPreviewFixtures(
    siteOrigin: string,
): { name: string; render: () => RenderedEmail }[] {
    const manageUrl = `${siteOrigin}/register/manage?token=preview-token`

    const confirmation: RegistrationConfirmationData = {
        name: 'Alice Patterson',
        eventTitle: 'Patterson Family Reunion 2027',
        eventDateRange: formatDateRange(
            new Date('2027-07-23T16:00:00-07:00'),
            new Date('2027-07-25T12:00:00-07:00'),
        ),
        venueName: 'Oakstop',
        venueAddress: '2323 Broadway, Oakland, CA',
        status: 'paid',
        paidByCard: true,
        partyMembers: [
            { name: 'Alice Patterson', tierLabel: 'Adult', priceCents: 17030, detail: 'Shirt M' },
            { name: 'Marcus Patterson', tierLabel: 'Adult', priceCents: 17030, detail: 'Shirt XL' },
            {
                name: 'Jada Patterson',
                tierLabel: 'Child',
                priceCents: 10330,
                detail: 'Age 9, Shirt YM',
            },
        ],
        totalCents: 44390,
        manageUrl,
    }

    const cancellation: CancellationEmailData = {
        name: 'Alice Patterson',
        eventTitle: 'Patterson Family Reunion 2027',
        partyMembers: [
            { name: 'Alice Patterson', tierLabel: 'Adult', priceCents: 17030 },
            { name: 'Marcus Patterson', tierLabel: 'Adult', priceCents: 17030 },
        ],
        totalCents: 34060,
        refundRoute: 'stripe',
        registerUrl: `${siteOrigin}/register`,
    }

    return [
        {
            name: 'confirmation-paid-card',
            render: () => renderRegistrationConfirmation(confirmation),
        },
        {
            name: 'confirmation-paid-card-with-gift',
            render: () =>
                renderRegistrationConfirmation({
                    ...confirmation,
                    donationCents: 5000,
                    totalCents: confirmation.totalCents + 5000,
                }),
        },
        {
            name: 'confirmation-paid-by-hand',
            render: () => renderRegistrationConfirmation({ ...confirmation, paidByCard: false }),
        },
        {
            name: 'confirmation-waived',
            render: () =>
                renderRegistrationConfirmation({
                    ...confirmation,
                    status: 'waived',
                    paidByCard: false,
                }),
        },
        {
            name: 'confirmation-pending',
            render: () =>
                renderRegistrationConfirmation({
                    ...confirmation,
                    status: 'pending',
                    paidByCard: false,
                }),
        },
        {
            name: 'confirmation-update',
            render: () =>
                renderRegistrationConfirmation({
                    ...confirmation,
                    isUpdate: true,
                    changeSummary: [
                        { summary: 'Jada Patterson was added to your party' },
                        { summary: 'Marcus Patterson — T-shirt', before: 'L', after: 'XL' },
                        {
                            summary: 'Contact email',
                            before: 'alice@exmaple.com',
                            after: 'alice@example.com',
                        },
                        { summary: 'Payment status', before: 'Awaiting payment', after: 'Paid' },
                    ],
                }),
        },
        { name: 'cancellation-stripe', render: () => renderCancellationEmail(cancellation) },
        {
            name: 'cancellation-stripe-kept-gift',
            render: () => renderCancellationEmail({ ...cancellation, keptDonationCents: 5000 }),
        },
        {
            name: 'cancellation-by-hand',
            render: () => renderCancellationEmail({ ...cancellation, refundRoute: 'by_hand' }),
        },
        {
            name: 'cancellation-nothing-paid',
            render: () => renderCancellationEmail({ ...cancellation, refundRoute: 'nothing_paid' }),
        },
        {
            name: 'cancellation-waived',
            render: () => renderCancellationEmail({ ...cancellation, refundRoute: 'waived' }),
        },
        {
            name: 'donation-receipt',
            render: () =>
                renderDonationReceipt({
                    donorName: 'Carol Patterson',
                    eventTitle: 'Patterson Family Reunion 2027',
                    amountCents: 5000,
                    givenOn: new Date(),
                    siteOrigin,
                }),
        },
        {
            name: 'recovery',
            render: () =>
                renderRecoveryEmail({
                    eventTitle: 'Patterson Family Reunion 2027',
                    manageUrl,
                }),
        },
    ]
}
