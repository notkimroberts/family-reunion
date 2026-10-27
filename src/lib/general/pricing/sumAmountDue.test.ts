import { describe, expect, it } from 'vitest'
import { sumAmountDue } from './sumAmountDue'

describe('sumAmountDue', () => {
    it('adds up only the places still owed', () => {
        expect(
            sumAmountDue([
                { priceCents: 16509, paymentDue: false },
                { priceCents: 10000, paymentDue: true },
                { priceCents: 16000, paymentDue: true },
            ]),
        ).toBe(26000)
    })

    it('is zero for a party with nobody owed', () => {
        expect(sumAmountDue([{ priceCents: 16509, paymentDue: false }])).toBe(0)
        expect(sumAmountDue([])).toBe(0)
    })
})
