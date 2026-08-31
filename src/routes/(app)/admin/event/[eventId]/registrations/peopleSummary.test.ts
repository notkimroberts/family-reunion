import { describe, it, expect } from 'vitest'
import type { EventPerson } from '$lib/server/registrations'
import { getPeopleSummary } from './peopleSummary'

function person(overrides: Partial<EventPerson>): EventPerson {
    return {
        id: 'pm-1',
        name: 'Alice Patterson',
        birthYear: 1980,
        birthMonth: 5,
        birthDay: 5,
        tierLabel: 'Adult',
        priceCents: 16000,
        shirtSize: 'L',
        vegetarianMeal: false,
        attendedReunion2025: true,
        isContact: true,
        registrationId: 'reg-1',
        contactName: 'Alice Patterson',
        contactEmail: 'alice@example.com',
        status: 'paid',
        ...overrides,
    }
}

describe('getPeopleSummary', () => {
    it('reports nothing to order for an empty list', () => {
        expect(getPeopleSummary([])).toEqual({
            shirtsByTier: [],
            shirtsMissing: 0,
            vegetarian: 0,
            standard: 0,
            mealUnanswered: 0,
        })
    })

    it('counts shirt sizes within each tier', () => {
        const summary = getPeopleSummary([
            person({ id: 'a', tierLabel: 'Adult', shirtSize: 'L' }),
            person({ id: 'b', tierLabel: 'Adult', shirtSize: 'L' }),
            person({ id: 'c', tierLabel: 'Adult', shirtSize: 'M' }),
            person({ id: 'd', tierLabel: 'Child', shirtSize: 'S' }),
        ])

        expect(summary.shirtsByTier).toEqual([
            {
                tierLabel: 'Adult',
                sizes: [
                    { size: 'M', count: 1 },
                    { size: 'L', count: 2 },
                ],
                missing: 0,
            },
            { tierLabel: 'Child', sizes: [{ size: 'S', count: 1 }], missing: 0 },
        ])
    })

    /* Sorted by name the sizes read L, M, S, XL, XS — useless for reading off an order form. */
    it('orders sizes smallest to largest, not alphabetically', () => {
        const summary = getPeopleSummary(
            ['XL', 'XS', 'M', 'XXL', 'S', 'L'].map((shirtSize, index) =>
                person({ id: `p${index}`, shirtSize }),
            ),
        )

        expect(summary.shirtsByTier[0].sizes.map((s) => s.size)).toEqual([
            'XS',
            'S',
            'M',
            'L',
            'XL',
            'XXL',
        ])
    })

    /* Youth shirts are a different garment, not a smaller adult one, so the sheet lists them as
       their own run at the top of the tier rather than interleaved with XS. */
    it('lists youth sizes ahead of adult sizes', () => {
        const summary = getPeopleSummary(
            ['M', 'YXL', 'XS', 'YS'].map((shirtSize, index) =>
                person({ id: `p${index}`, shirtSize }),
            ),
        )

        expect(summary.shirtsByTier[0].sizes.map((s) => s.size)).toEqual(['YS', 'YXL', 'XS', 'M'])
    })

    /* A size from before the list settled must still be visible — it is a real garment somebody needs. */
    it('keeps an unrecognised size, sorted to the end', () => {
        const summary = getPeopleSummary([
            person({ id: 'a', shirtSize: '4XL' }),
            person({ id: 'b', shirtSize: 'M' }),
        ])

        expect(summary.shirtsByTier[0].sizes.map((s) => s.size)).toEqual(['M', '4XL'])
    })

    /* A missing size is a person to go back to, not a size to guess, so it is never folded into a count. */
    it.each([
        ['null', null],
        ['empty', ''],
        ['whitespace', '   '],
    ])('counts a %s shirt size as not recorded', (_label, shirtSize) => {
        const summary = getPeopleSummary([
            person({ id: 'a', shirtSize }),
            person({ id: 'b', shirtSize: 'L' }),
        ])

        expect(summary.shirtsMissing).toBe(1)
        expect(summary.shirtsByTier[0].missing).toBe(1)
        expect(summary.shirtsByTier[0].sizes).toEqual([{ size: 'L', count: 1 }])
    })

    /* Three vegetarians and two unknowns is a different catering order from three vegetarians. Folding
       the unknowns into "standard" would silently under-order. */
    it('keeps an unanswered meal separate from a declined one', () => {
        const summary = getPeopleSummary([
            person({ id: 'a', vegetarianMeal: true }),
            person({ id: 'b', vegetarianMeal: true }),
            person({ id: 'c', vegetarianMeal: false }),
            person({ id: 'd', vegetarianMeal: null }),
            person({ id: 'e', vegetarianMeal: null }),
        ])

        expect(summary.vegetarian).toBe(2)
        expect(summary.standard).toBe(1)
        expect(summary.mealUnanswered).toBe(2)
    })

    /* Tier order must not follow the people list, which is ordered by contact name. */
    it('lists tiers alphabetically whatever order the people arrive in', () => {
        const summary = getPeopleSummary([
            person({ id: 'a', tierLabel: 'Teen' }),
            person({ id: 'b', tierLabel: 'Adult' }),
            person({ id: 'c', tierLabel: 'Child' }),
        ])

        expect(summary.shirtsByTier.map((t) => t.tierLabel)).toEqual(['Adult', 'Child', 'Teen'])
    })
})
