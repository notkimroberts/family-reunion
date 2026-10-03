import { describe, expect, it } from 'vitest'
import { diffMemberDetails, type MemberDetailValues } from './_diffMemberDetails'

const BO: MemberDetailValues = {
    name: 'Bo Patterson',
    tierLabel: 'Child',
    priceCents: 9000,
    birthYear: 2018,
    birthMonth: 3,
    birthDay: 15,
    shirtSize: 'YM',
    vegetarianMeal: false,
    attendedReunion2025: null,
}

describe('diffMemberDetails', () => {
    /* The edit form resubmits every attendee on each save. An unchanged row must report nothing, or
       the update email lists people nobody touched. */
    it('reports nothing when no value moved', () => {
        expect(diffMemberDetails(BO, { ...BO })).toEqual([])
    })

    it('reports each edited field as before → after, named for the attendee', () => {
        expect(
            diffMemberDetails(BO, {
                ...BO,
                shirtSize: 'YL',
                birthYear: 2017,
                vegetarianMeal: true,
            }),
        ).toEqual([
            {
                summary: 'Bo Patterson — Birthday',
                before: 'March 15, 2018',
                after: 'March 15, 2017',
            },
            { summary: 'Bo Patterson — T-shirt', before: 'YM', after: 'YL' },
            { summary: 'Bo Patterson — Vegetarian meal', before: 'No', after: 'Yes' },
        ])
    })

    /* A tier change is a price change, and the price is what the registrant will check. */
    it('carries the price with a tier change', () => {
        expect(diffMemberDetails(BO, { ...BO, tierLabel: 'Adult', priceCents: 16000 })).toEqual([
            {
                summary: 'Bo Patterson — Registration tier',
                before: 'Child ($90.00)',
                after: 'Adult ($160.00)',
            },
        ])
    })

    /* A blank renders as "Not given", not as an empty string after the arrow. */
    it('names a cleared or never-answered value', () => {
        expect(
            diffMemberDetails(BO, { ...BO, shirtSize: null, attendedReunion2025: true }),
        ).toEqual([
            { summary: 'Bo Patterson — T-shirt', before: 'YM', after: 'Not given' },
            {
                summary: 'Bo Patterson — Attended the 2025 reunion',
                before: 'Not given',
                after: 'Yes',
            },
        ])
    })

    it('labels a rename by the name the reader knew', () => {
        expect(diffMemberDetails(BO, { ...BO, name: 'Bo P' })).toEqual([
            { summary: 'Bo Patterson — Name', before: 'Bo Patterson', after: 'Bo P' },
        ])
    })
})
