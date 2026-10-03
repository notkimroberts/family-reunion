import { describe, expect, it, vi } from 'vitest'
import {
    renderCancellationEmail,
    renderRecoveryEmail,
    renderRegistrationConfirmation,
} from './templates'
import type { RegistrationConfirmationData } from './templates'

vi.mock('$lib/general/constants', () => ({
    APP_NAME: 'Family Reunion',
    REUNION_NAME: 'Roberts Family Reunion',
    APP_DOMAIN: 'example.com',
    CONTACT_EMAIL: 'organiser@example.com',
    CONTACT_PHONE: '+1 555 0100',
    HOST_HOTEL: {
        kind: 'hotel',
        badge: 'Host Hotel',
        name: 'Kissel Uptown Oakland',
        tagline: 'A short walk from the venue.',
        websiteUrl: 'https://example.com/hotel',
        bookingUrl: 'https://example.com/book',
        bookingDeadline: 'June 1, 2030',
        mapQuery: 'Kissel Uptown Oakland',
        details: [],
        parking: [
            { name: 'Hotel valet', price: '$40 / night' },
            { name: 'Telegraph Plaza', price: '$20 / day', address: '2100 Telegraph Ave' },
        ],
    },
}))

describe('renderRecoveryEmail', () => {
    const data = {
        eventTitle: 'Family Reunion 2026',
        manageUrl: 'https://example.com/register/manage?token=abc',
    }

    it('includes the management URL in both bodies', () => {
        const { text, html } = renderRecoveryEmail(data)
        expect(text).toContain(data.manageUrl)
        expect(html).toContain(data.manageUrl)
    })

    it('subject references the event', () => {
        expect(renderRecoveryEmail(data).subject).toContain('Family Reunion 2026')
    })

    /* Rotation retires the previous link after a grace period, so the email says which to keep —
       but must not claim the old one is already dead, which is false for seven days and sends
       people to support holding a link that works. */
    it('says to use the newest link without claiming older ones are already dead', () => {
        const { text, html } = renderRecoveryEmail(data)
        for (const body of [text, html]) {
            expect(body).toContain('earlier links stop working within a week')
            expect(body).not.toContain('no longer work')
        }
    })

    it('greets the reader in both bodies', () => {
        const { text, html } = renderRecoveryEmail(data)
        expect(text).toContain('Hi,')
        expect(html).toContain('Hi,')
    })
})

describe('renderRegistrationConfirmation', () => {
    const data: RegistrationConfirmationData = {
        name: 'Alice',
        eventTitle: 'Roberts Family Reunion 2026',
        eventDateRange: 'July 23 – 25, 2027',
        venueName: 'Lakeside Lodge',
        venueAddress: '1 Lake Road, Springfield',
        status: 'paid',
        paidByCard: true,
        partyMembers: [
            { name: 'Alice', tierLabel: 'Adult', priceCents: 10000 },
            { name: 'Bob', tierLabel: 'Child', priceCents: 5000, detail: 'Age 8, Shirt M' },
        ],
        totalCents: 15000,
        manageUrl: 'https://example.com/register/manage?token=tok',
    }

    it('subject includes the event title', () => {
        expect(renderRegistrationConfirmation(data).subject).toBe(
            'Registration confirmed: Roberts Family Reunion 2026',
        )
    })

    it('greets the registrant by name', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('Hi Alice,')
        expect(html).toContain('Hi Alice,')
    })

    /* Rooms sell out and this app cannot book them, so the confirmation — the message people keep —
       has to point at the host hotel. In BOTH bodies: a text-only client that lost the prompt would
       leave that reader thinking accommodation was handled.

       The GROUP BOOKING link, not the hotel's own site: the latter quotes rack rates and knows
       nothing about the reunion's block, so a registrant who follows it books outside it. */
    it('points the registrant at the host hotel room block', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('Kissel Uptown Oakland')
        expect(text).toContain('https://example.com/book')
        expect(html).toContain('Kissel Uptown Oakland')
        expect(html).toContain('href="https://example.com/book"')
    })

    /* Only the hotel's own option is quoted; the full list with prices lives on the site, linked on
       the domain the email came from, so it cannot go stale in an inbox. */
    it('quotes the hotel parking and links the site for nearby garages', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('Parking: Hotel valet, $40 / night.')
        expect(text).toContain('https://example.com/#venue')
        expect(html).toContain('Hotel valet, $40 / night.')
        expect(html).toContain('href="https://example.com/#venue"')
        for (const body of [text, html]) {
            expect(body).not.toContain('Telegraph Plaza')
        }
    })

    /* The cutoff is the reason to act on the prompt rather than file it. */
    it('states the date the block rate expires in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('June 1, 2030')
        expect(html).toContain('June 1, 2030')
    })

    it('lists every party member with tier and price in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        for (const body of [text, html]) {
            expect(body).toContain('Alice')
            expect(body).toContain('Adult')
            expect(body).toContain('$100.00')
            expect(body).toContain('Bob')
            expect(body).toContain('Child')
            expect(body).toContain('$50.00')
            expect(body).toContain('Age 8, Shirt M')
        }
    })

    it('includes the total and the manage URL', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('Total paid: $150.00')
        expect(html).toContain('$150.00')
        expect(text).toContain(data.manageUrl)
        expect(html).toContain(data.manageUrl)
    })

    it('includes event date and venue when present', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        for (const body of [text, html]) {
            expect(body).toContain('July 23 – 25, 2027')
            expect(body).toContain('Lakeside Lodge')
            expect(body).toContain('1 Lake Road, Springfield')
        }
    })

    it('omits date and venue lines when the event has neither', () => {
        const { text } = renderRegistrationConfirmation({
            ...data,
            eventDateRange: undefined,
            venueName: undefined,
            venueAddress: undefined,
        })
        expect(text).not.toContain('undefined')
    })

    /* One template serves the online path and admin paper entry, so the money sentence is the
       thing that has to change per status. */
    describe('status-aware copy', () => {
        it('paid by card says the payment went through and that prices include the fee', () => {
            const { subject, text, html } = renderRegistrationConfirmation({
                ...data,
                status: 'paid',
            })
            expect(subject).toContain('Registration confirmed')
            expect(text).toContain('payment has gone through')
            expect(text).toContain('Total paid')
            expect(text).toContain('Prices include the card processing fee.')
            expect(html).toContain('Prices include the card processing fee.')
        })

        /* An organiser recording a cheque marks it 'paid' too, and "gone through" reads as a card
           charge to someone who never gave a card. Nor did their price carry a card fee. */
        it('paid by hand says the payment was received, with no card fee note', () => {
            const { text } = renderRegistrationConfirmation({
                ...data,
                status: 'paid',
                paidByCard: false,
            })
            expect(text).toContain('we have received your payment')
            expect(text).not.toContain('gone through')
            expect(text).not.toContain('card processing fee')
        })

        it('waived says nothing is owed', () => {
            const { subject, text } = renderRegistrationConfirmation({ ...data, status: 'waived' })
            expect(subject).toContain('Registration confirmed')
            expect(text).toContain('No payment is needed')
            expect(text).toContain('nothing to pay')
            expect(text).not.toContain('Total paid')
            /* Must not imply money is owed while also saying nothing is owed. */
            expect(text).not.toContain('Amount due')
            expect(text).toContain('Total (covered): $150.00')
        })

        it('pending says payment is still outstanding and how to pay', () => {
            const { subject, text } = renderRegistrationConfirmation({ ...data, status: 'pending' })
            expect(subject).toContain('Registration received')
            expect(text).toContain('not complete until payment is received')
            expect(text).toContain('Amount due: $150.00')
            expect(text).toContain('Reply to this email to arrange payment.')
            expect(text).not.toContain('card processing fee')
        })

        /* The one thing a pending registrant must do. As a muted note under the table it was easy
           to read past, so it leads — boxed in HTML, capitalised in text, and in the inbox preview. */
        it('pending puts the payment request up front in every form', () => {
            const { text, html } = renderRegistrationConfirmation({ ...data, status: 'pending' })
            expect(text).toContain(
                'PAYMENT NEEDED: $150.00. Reply to this email to arrange payment.',
            )
            expect(text.indexOf('PAYMENT NEEDED')).toBeLessThan(text.indexOf('Your party:'))
            expect(html).toContain('Payment needed: $150.00')
            expect(html.indexOf('Payment needed: $150.00')).toBeLessThan(html.indexOf('Your party'))
        })

        it('only pending carries a payment request', () => {
            for (const status of ['paid', 'waived'] as const) {
                const { text } = renderRegistrationConfirmation({ ...data, status })
                expect(text).not.toContain('PAYMENT NEEDED')
            }
        })
    })

    it('handles a single party member', () => {
        const { text } = renderRegistrationConfirmation({
            ...data,
            partyMembers: [{ name: 'Alice', tierLabel: 'Adult', priceCents: 10000 }],
            totalCents: 10000,
        })
        expect(text).toContain('- Alice (Adult)')
    })

    /* Names and venue text are registrant- or organiser-supplied and land inside HTML. */
    it('escapes HTML in supplied names', () => {
        const { html } = renderRegistrationConfirmation({
            ...data,
            name: '<script>alert(1)</script>',
            partyMembers: [
                { name: 'Bobby "Drop" Tables & Co', tierLabel: 'Adult', priceCents: 10000 },
            ],
        })
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;')
        expect(html).toContain('Bobby &quot;Drop&quot; Tables &amp; Co')
    })

    /* An edited value shows what it was and what it is now, so a wrong correction can be spotted. */
    it('shows each change as before → after in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation({
            ...data,
            isUpdate: true,
            changeSummary: [
                { summary: 'Bob — T-shirt', before: 'M', after: 'L' },
                { summary: 'Jada was added to your party' },
            ],
        })
        expect(text).toContain('  - Bob — T-shirt: M → L')
        expect(text).toContain('  - Jada was added to your party')
        expect(html).toContain('<span style="text-decoration:line-through;">M</span> &rarr;')
        expect(html).toContain('Jada was added to your party')
    })

    /* Will and Roxie, from the same origin as the email's own links. */
    it('loads the header image from the site the links point at', () => {
        const { html } = renderRegistrationConfirmation(data)
        expect(html).toContain('src="https://example.com/will_and_roxie_email.jpg"')
        expect(html).toContain('alt="Will and Roxie Patterson"')
    })

    /* Registrants can no longer edit their own booking, so the email they keep says who can. */
    it('says how to get the registration changed, in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        expect(text).toContain('an organizer will update it for you')
        expect(html).toContain('an organizer will update it for you')
    })

    it('signs off the same way in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        for (const body of [text, html]) {
            expect(body).toContain('Reply to this email')
            expect(body).toContain('See you at the reunion!')
        }
    })

    /* The footer used to say "because you registered", which was false for every donor, and built
       the reunion's name by slicing a letter off APP_NAME. */
    it('names the reunion in the footer without assuming the reader registered', () => {
        const { html } = renderRegistrationConfirmation(data)
        expect(html).toContain('You are receiving this email about the Roberts Family Reunion.')
        expect(html).not.toContain('because you registered')
    })

    it('produces a complete HTML document with a preheader', () => {
        const { html } = renderRegistrationConfirmation(data)
        expect(html.startsWith('<!doctype html>')).toBe(true)
        expect(html).toContain('mso-hide:all')
        expect(html).toContain('2 people registered')
    })
})

/* Every template ends in the same contact footer, and the footer was shipping a broken link:
   `tel:(510) 575-9080` puts raw spaces and parens in an href, which is not a valid URI. Resend's
   insights flagged it and some clients drop the link entirely.

   Asserted on all three at once, because the footer is copy-pasted between them rather than shared —
   fixing one and missing another is the obvious failure mode. The number must still READ in its
   human format, so this pins the href and the visible text separately: an assertion on the rendered
   digits alone would pass with the href still malformed. */
describe('the contact footer in every template', () => {
    const rendered = [
        ['recovery', renderRecoveryEmail({ eventTitle: 'Reunion', manageUrl: 'https://x/y' })],
        [
            'confirmation',
            renderRegistrationConfirmation({
                name: 'Alice',
                eventTitle: 'Reunion',
                partyMembers: [{ name: 'Alice', tierLabel: 'Adult', priceCents: 16000 }],
                totalCents: 16000,
                manageUrl: 'https://x/y',
                status: 'paid',
                paidByCard: true,
            }),
        ],
        [
            'cancellation',
            renderCancellationEmail({
                name: 'Alice',
                eventTitle: 'Reunion',
                partyMembers: [{ name: 'Alice', tierLabel: 'Adult', priceCents: 16000 }],
                totalCents: 16000,
                refundRoute: 'stripe',
                registerUrl: 'https://x/register',
            }),
        ],
    ] as const

    it.each(rendered)('%s links the phone number as a usable URI', (_label, { html }) => {
        expect(html).toContain('href="tel:+15550100"')
    })

    /* The specific defect: anything between `tel:` and the closing quote that a URI parser rejects. */
    it.each(rendered)('%s puts no space or paren in the tel href', (_label, { html }) => {
        const href = html.match(/href="tel:([^"]*)"/)?.[1]
        expect(href).toBeDefined()
        expect(href).toMatch(/^\+?\d+$/)
    })

    /* And the number is still readable, which is the whole reason CONTACT_PHONE is stored formatted. */
    it.each(rendered)('%s still shows the number in human form', (_label, { html }) => {
        expect(html).toContain('+1 555 0100')
    })
})
