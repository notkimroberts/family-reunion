import { describe, expect, it } from 'vitest'
import { renderDonationReceipt } from './renderDonationReceipt'

const data = {
    donorName: 'Carol',
    eventTitle: 'Reunion 2027',
    amountCents: 5000,
    /* 8:30 PM Pacific — already the next day in UTC, where the server runs. */
    givenOn: new Date('2026-10-02T20:30:00-07:00'),
    siteOrigin: 'https://example.com',
}

describe('renderDonationReceipt', () => {
    it('states the amount and the event in both bodies', () => {
        const { subject, text, html } = renderDonationReceipt(data)
        expect(subject).toBe('Thank you for your gift to Reunion 2027')
        for (const body of [text, html]) {
            expect(body).toContain('$50.00')
            expect(body).toContain('Reunion 2027')
        }
    })

    /* A receipt has to be matchable to a card statement, and an evening gift must not be dated the
       next day because the server runs on UTC. */
    it('dates the gift in the reunion time zone in both bodies', () => {
        const { text, html } = renderDonationReceipt(data)
        for (const body of [text, html]) {
            expect(body).toContain('October 2, 2026')
            expect(body).toContain('PDT')
        }
    })

    it('greets the donor the same way in both bodies', () => {
        const { text, html } = renderDonationReceipt(data)
        expect(text).toContain('Hi Carol,')
        expect(html).toContain('Hi Carol,')
    })

    /* A family reunion is not a registered charity; a receipt that looks like one invites a claim. */
    it('says the gift is not tax-deductible in both bodies', () => {
        const { text, html } = renderDonationReceipt(data)
        expect(text).toContain('not tax-deductible')
        expect(html).toContain('not tax-deductible')
    })

    /* A receipt carries no link to take an origin from, so it is passed in. */
    it('loads the header image from the site it came from', () => {
        expect(renderDonationReceipt(data).html).toContain(
            'src="https://example.com/will_and_roxie_email.jpg"',
        )
    })

    it('escapes the donor name in HTML', () => {
        const { html } = renderDonationReceipt({ ...data, donorName: '<b>Carol</b>' })
        expect(html).not.toContain('<b>Carol</b>')
        expect(html).toContain('&lt;b&gt;Carol&lt;/b&gt;')
    })
})
