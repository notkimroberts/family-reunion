import { describe, it, expect, vi } from 'vitest'
import { renderRecoveryEmail, renderRegistrationConfirmation } from './templates'
import type { RegistrationConfirmationData } from './templates'

vi.mock('$lib/general/constants', () => ({
    APP_NAME: 'Family Reunion',
    APP_DOMAIN: 'example.com',
    CONTACT_EMAIL: 'organiser@example.com',
    CONTACT_PHONE: '+1 555 0100',
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

    /* Rotation invalidates the previous link, so the email has to say so — a registrant with
       two emails open would otherwise click the dead one and think the site is broken. */
    it('warns that earlier links stop working', () => {
        const { text, html } = renderRecoveryEmail(data)
        expect(text).toContain('older links no longer work')
        expect(html).toContain('older links no longer work')
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
        partyMembers: [
            { name: 'Alice', tierLabel: 'Adult', priceCents: 10000 },
            { name: 'Bob', tierLabel: 'Child', priceCents: 5000, detail: 'age 8, shirt M' },
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

    it('lists every party member with tier and price in both bodies', () => {
        const { text, html } = renderRegistrationConfirmation(data)
        for (const body of [text, html]) {
            expect(body).toContain('Alice')
            expect(body).toContain('Adult')
            expect(body).toContain('$100.00')
            expect(body).toContain('Bob')
            expect(body).toContain('Child')
            expect(body).toContain('$50.00')
            expect(body).toContain('age 8, shirt M')
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
        it('paid says the payment went through', () => {
            const { subject, text } = renderRegistrationConfirmation({ ...data, status: 'paid' })
            expect(subject).toContain('Registration confirmed')
            expect(text).toContain('payment has gone through')
            expect(text).toContain('Total paid')
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
            expect(text).toContain('get in touch to arrange payment')
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

    it('produces a complete HTML document with a preheader', () => {
        const { html } = renderRegistrationConfirmation(data)
        expect(html.startsWith('<!doctype html>')).toBe(true)
        expect(html).toContain('mso-hide:all')
        expect(html).toContain('2 people registered')
    })
})
