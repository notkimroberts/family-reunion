import { describe, expect, it } from 'vitest'
import { getBookingDisplayStatus } from './getBookingDisplayStatus'
import { getPersonDisplayStatus } from './getPersonDisplayStatus'

describe('getBookingDisplayStatus', () => {
    /* Stored as paid so the people who paid stay on the check-in list; shown as Paid it reads as
       settled while it still owes. */
    it('shows a paid booking that still owes as partly paid', () => {
        expect(getBookingDisplayStatus({ status: 'paid', amountDueCents: 16500 })).toBe(
            'partly_paid',
        )
    })

    it('shows a paid booking that owes nothing as paid', () => {
        expect(getBookingDisplayStatus({ status: 'paid', amountDueCents: 0 })).toBe('paid')
    })

    /* Only a paid booking can owe this way: leaving 'paid' clears the flag. */
    it.each(['pending', 'waived', 'refunded'] as const)(
        'shows a %s booking as stored',
        (status) => {
            expect(getBookingDisplayStatus({ status, amountDueCents: 0 })).toBe(status)
        },
    )
})

describe('getPersonDisplayStatus', () => {
    it('shows an owed person on a paid booking as payment due', () => {
        expect(getPersonDisplayStatus({ status: 'paid', paymentDue: true })).toBe('payment_due')
    })

    it('shows everyone else with their booking’s status', () => {
        expect(getPersonDisplayStatus({ status: 'paid', paymentDue: false })).toBe('paid')
        expect(getPersonDisplayStatus({ status: 'waived', paymentDue: false })).toBe('waived')
    })
})
