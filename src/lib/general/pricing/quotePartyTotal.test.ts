import { describe, expect, it } from 'vitest'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import { quotePartyTotal } from './quotePartyTotal'

/* What the payer is quoted. The server prices the same party independently when it builds the
   Stripe line items, so the contract that matters most here is that the two agree to the cent. */
describe('quotePartyTotal', () => {
    it('sums the tier prices as the subtotal', () => {
        expect(quotePartyTotal([16000, 9000]).subtotalCents).toBe(25000)
    })

    /* THE contract. Stripe's 30¢ is per charge and the app grosses each member up individually, so
       the quote must add the fee per member. Taking 2.9% + 30¢ off the subtotal once would quote a
       party of four 90¢ less than their card is charged. */
    it('charges the fixed fee once per member, not once per party', () => {
        const one = quotePartyTotal([16000])
        const four = quotePartyTotal([16000, 16000, 16000, 16000])

        expect(four.feeCents).toBe(one.feeCents * 4)
    })

    /* The server builds its Stripe line items from grossUpForStripe. If these ever disagree, the
       register page shows one number and the card is charged another. */
    it('totals exactly what the server grosses each member up to', () => {
        const prices = [16000, 9000, 4550]

        expect(quotePartyTotal(prices).totalCents).toBe(
            prices.reduce((sum, cents) => sum + grossUpForStripe(cents), 0),
        )
    })

    /* Paper entry. A cheque costs nothing to process, so quoting a fee would invent a deduction
       Stripe never made. */
    it('quotes no fee when the money did not go through Stripe', () => {
        const quote = quotePartyTotal([16000, 9000], { applyStripeFee: false })

        expect(quote.feeCents).toBe(0)
        expect(quote.totalCents).toBe(25000)
    })

    /* An empty form — no tier picked yet — must read as zero, not NaN. */
    it('is zero for an empty party', () => {
        expect(quotePartyTotal([])).toEqual({
            subtotalCents: 0,
            feeCents: 0,
            donationCents: 0,
            totalCents: 0,
        })
    })

    /* A gift is charged at face value: tier prices are grossed up because they are what the reunion
       must NET, but a gift is whatever the giver chose to give. */
    it('adds a gift to the total without charging a fee on it', () => {
        const withoutGift = quotePartyTotal([16000])
        const withGift = quotePartyTotal([16000], { donationCents: 5000 })

        expect(withGift.feeCents).toBe(withoutGift.feeCents)
        expect(withGift.totalCents).toBe(withoutGift.totalCents + 5000)
    })

    /* Subtotal stays the cost of the PLACES. A gift folded into it would make "Subtotal" and
       "Processing fee" describe two different amounts of money. */
    it('keeps the gift out of the subtotal', () => {
        expect(quotePartyTotal([16000], { donationCents: 5000 }).subtotalCents).toBe(16000)
    })

    /* Paper entry with a gift: no processing fee anywhere, and the gift still lands on the total. */
    it('adds a gift to an offline party total', () => {
        const quote = quotePartyTotal([16000], { applyStripeFee: false, donationCents: 2500 })

        expect(quote.feeCents).toBe(0)
        expect(quote.totalCents).toBe(18500)
    })

    /* A comped place is 0, and grossUpForStripe returns 0 rather than the bare 30¢ for it. */
    it('adds no fee to a free place', () => {
        expect(quotePartyTotal([0]).totalCents).toBe(0)
    })
})
