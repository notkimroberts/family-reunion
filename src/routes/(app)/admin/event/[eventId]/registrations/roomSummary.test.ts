import { describe, expect, it } from 'vitest'
import type { RegistrationSummary } from '$lib/server/registrations'
import { getRoomSummary } from './roomSummary'

/* The room block. The distinctions this pins are the ones that cost money if collapsed:
   maybes are not yeses, maybes are not noes, and a booking nobody ever asked is neither. */

function reg(overrides: Partial<RegistrationSummary>): RegistrationSummary {
    return {
        id: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        contactPhone: null,
        status: 'paid',
        stripeSessionId: 'cs_test_1',
        stripePaymentIntentId: 'pi_test_1',
        stripeFeeCents: null,
        paidAt: new Date('2026-08-10T00:00:00Z'),
        stayingAtHostHotel: 'yes',
        memberCount: 1,
        totalCents: 16509,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        ...overrides,
    }
}

describe('getRoomSummary', () => {
    it('reports nothing to book for a year with no registrations', () => {
        expect(getRoomSummary([])).toEqual({
            stayingParties: 0,
            stayingPeople: 0,
            undecidedParties: 0,
            undecidedPeople: 0,
            elsewhereParties: 0,
            notAskedParties: 0,
            hasAnswers: false,
        })
    })

    /* A block is negotiated in rooms, and a party of five is not one room — so both figures matter. */
    it('counts parties and the people in them', () => {
        const summary = getRoomSummary([
            reg({ id: 'a', stayingAtHostHotel: 'yes', memberCount: 5 }),
            reg({ id: 'b', stayingAtHostHotel: 'yes', memberCount: 2 }),
        ])

        expect(summary.stayingParties).toBe(2)
        expect(summary.stayingPeople).toBe(7)
    })

    /* THE reason the question has three answers. Folded into "yes" this over-books the block; folded
       into "no" it under-books it. */
    it('keeps the undecided apart from both yes and no', () => {
        const summary = getRoomSummary([
            reg({ id: 'a', stayingAtHostHotel: 'yes', memberCount: 3 }),
            reg({ id: 'b', stayingAtHostHotel: 'undecided', memberCount: 4 }),
            reg({ id: 'c', stayingAtHostHotel: 'no', memberCount: 2 }),
        ])

        expect(summary).toMatchObject({
            stayingParties: 1,
            stayingPeople: 3,
            undecidedParties: 1,
            undecidedPeople: 4,
            elsewhereParties: 1,
        })
    })

    /* Null is "never asked", not "unsure". Every booking that predates the question has one, and
       counting those as maybes would inflate the block by the whole history of the reunion. */
    it('separates bookings that were never asked from the undecided', () => {
        const summary = getRoomSummary([
            reg({ id: 'a', stayingAtHostHotel: null }),
            reg({ id: 'b', stayingAtHostHotel: 'undecided' }),
        ])

        expect(summary.notAskedParties).toBe(1)
        expect(summary.undecidedParties).toBe(1)
    })

    /* A year of nothing but old bookings has no answers to show, so the panel stays quiet. */
    it('reports no answers when every booking predates the question', () => {
        const summary = getRoomSummary([reg({ stayingAtHostHotel: null })])

        expect(summary.hasAnswers).toBe(false)
        expect(summary.notAskedParties).toBe(1)
    })

    it('reports answers once one booking has been asked', () => {
        expect(getRoomSummary([reg({ stayingAtHostHotel: 'no' })]).hasAnswers).toBe(true)
    })

    /* Paid and waived only — the same set the shirt and meal counts use. A room held for a party that
       never pays is a room paid for empty, and a cancelled one is not coming at all. */
    it.each(['pending', 'refunded'] as const)('ignores a %s booking', (status) => {
        const summary = getRoomSummary([
            reg({ id: 'a', stayingAtHostHotel: 'yes', memberCount: 2 }),
            reg({ id: 'b', status, stayingAtHostHotel: 'yes', memberCount: 9 }),
        ])

        expect(summary.stayingParties).toBe(1)
        expect(summary.stayingPeople).toBe(2)
    })

    it('counts a comped party, which still needs a room', () => {
        const summary = getRoomSummary([
            reg({ status: 'waived', stayingAtHostHotel: 'yes', memberCount: 3 }),
        ])

        expect(summary.stayingParties).toBe(1)
        expect(summary.stayingPeople).toBe(3)
    })
})
