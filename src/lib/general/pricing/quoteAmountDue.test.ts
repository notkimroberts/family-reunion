import { describe, expect, it } from 'vitest'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { quoteAmountDue } from './quoteAmountDue'

const PAID = { id: 'm1', name: 'Alice', tierLabel: 'Adult', priceCents: 16509, paymentDue: false }
const OWED_CHILD = {
    id: 'm2',
    name: 'Jada',
    tierLabel: 'Child',
    priceCents: 10000,
    paymentDue: true,
}
const OWED_ADULT = {
    id: 'm3',
    name: 'Marcus',
    tierLabel: 'Adult',
    priceCents: 16000,
    paymentDue: true,
}

describe('quoteAmountDue', () => {
    it('lists only the owed places, each grossed up on its own', () => {
        const quote = quoteAmountDue([PAID, OWED_CHILD, OWED_ADULT])

        expect(quote.lines).toEqual([
            {
                memberId: 'm2',
                name: 'Jada',
                tierLabel: 'Child',
                netCents: 10000,
                grossCents: grossUpForStripe(10000),
            },
            {
                memberId: 'm3',
                name: 'Marcus',
                tierLabel: 'Adult',
                netCents: 16000,
                grossCents: grossUpForStripe(16000),
            },
        ])
    })

    /* Per line, not on the sum: Stripe's 30¢ is charged per line item, and quoting it once would
       disagree with what the Checkout session then charges. */
    it('totals the per-line grosses, and the fee is the difference from the net', () => {
        const quote = quoteAmountDue([OWED_CHILD, OWED_ADULT])
        const cardTotalCents = grossUpForStripe(10000) + grossUpForStripe(16000)

        expect(quote).toMatchObject({
            netCents: 26000,
            cardTotalCents,
            feeCents: cardTotalCents - 26000,
        })
        expect(quote.cardTotalCents).not.toBe(grossUpForStripe(26000))
    })

    it('quotes nothing when nobody is owed', () => {
        expect(quoteAmountDue([PAID])).toEqual({
            lines: [],
            netCents: 0,
            feeCents: 0,
            cardTotalCents: 0,
        })
    })
})
