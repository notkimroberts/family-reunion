import { describe, expect, it } from 'vitest'
import type { EventPerson, RegistrationSummary } from '$lib/server/registrations'
import { getFollowUps } from './followUps'

const NOW = new Date('2026-11-10T12:00:00Z')
const OLD = new Date('2026-11-01T00:00:00Z')
const RECENT = new Date('2026-11-09T12:00:00Z')
const OPTIONS = { now: NOW, askHotel: true }

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
        paidAt: OLD,
        stayingAtHostHotel: 'yes',
        memberCount: 1,
        totalCents: 16509,
        amountDueCents: 0,
        createdAt: OLD,
        ...overrides,
    }
}

function person(overrides: Partial<EventPerson>): EventPerson {
    return {
        id: 'p-1',
        name: 'Alice Patterson',
        birthYear: null,
        birthMonth: null,
        birthDay: null,
        tierLabel: 'Adult',
        priceCents: 16509,
        shirtSize: 'M',
        addressCity: null,
        addressState: null,
        addressZip: null,
        vegetarianMeal: null,
        attendedReunion2025: null,
        isContact: true,
        registrationId: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        status: 'paid',
        paymentDue: false,
        checkedInAt: null,
        checkedInBy: null,
        shirtGivenAt: null,
        ...overrides,
    }
}

const reasonsOf = (
    registrations: RegistrationSummary[],
    people: EventPerson[] = [],
    options = OPTIONS,
) =>
    getFollowUps(registrations, people, options).map((followUp) => [
        followUp.registration.id,
        followUp.reasons,
    ])

describe('getFollowUps', () => {
    it('lists nothing for a settled booking with every answer', () => {
        expect(reasonsOf([reg({})], [person({})])).toEqual([])
    })

    it('flags a paid booking that still owes for someone added', () => {
        expect(reasonsOf([reg({ amountDueCents: 16500 })])).toEqual([['reg-1', ['payment_due']]])
    })

    it('flags a check not received once three days old', () => {
        expect(
            reasonsOf([
                reg({ id: 'check', status: 'pending', stripeSessionId: null }),
                reg({ id: 'fresh', status: 'pending', stripeSessionId: null, createdAt: RECENT }),
            ]),
        ).toEqual([['check', ['awaiting_check']]])
    })

    /* Still on Stripe's page, or about to be deleted when its session expires. */
    it('never lists an unpaid card checkout, whatever else it lacks', () => {
        expect(
            reasonsOf(
                [reg({ status: 'pending', stayingAtHostHotel: null })],
                [person({ shirtSize: null })],
            ),
        ).toEqual([])
    })

    it('never lists a refunded booking', () => {
        expect(reasonsOf([reg({ status: 'refunded', stayingAtHostHotel: null })])).toEqual([])
    })

    it('names the people with no shirt size', () => {
        const [followUp] = getFollowUps(
            [reg({})],
            [person({}), person({ id: 'p-2', name: 'Will Jr', shirtSize: null })],
            OPTIONS,
        )
        expect(followUp.reasons).toEqual(['missing_shirt_size'])
        expect(followUp.missingShirtNames).toEqual(['Will Jr'])
    })

    it('asks about the hotel only when one is listed, and keeps never-asked apart from unsure', () => {
        const bookings = [
            reg({ id: 'unsure', stayingAtHostHotel: 'undecided' }),
            reg({ id: 'unasked', stayingAtHostHotel: null }),
        ]
        expect(reasonsOf(bookings)).toEqual([
            ['unsure', ['hotel_undecided']],
            ['unasked', ['hotel_not_asked']],
        ])
        expect(reasonsOf(bookings, [], { now: NOW, askHotel: false })).toEqual([])
    })

    it('puts the booking with most reasons first, then the oldest', () => {
        expect(
            reasonsOf([
                reg({ id: 'newer', stayingAtHostHotel: null, createdAt: RECENT }),
                reg({ id: 'older', stayingAtHostHotel: null, createdAt: OLD }),
                reg({
                    id: 'two',
                    stayingAtHostHotel: null,
                    amountDueCents: 100,
                    createdAt: RECENT,
                }),
            ]).map(([id]) => id),
        ).toEqual(['two', 'older', 'newer'])
    })
})
