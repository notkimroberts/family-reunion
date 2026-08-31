import { describe, expect, it } from 'vitest'
import { defaultAdultTierId } from './defaultAdultTierId'

const ADULT = { id: 'tier-adult', label: 'Adult' }
const CHILD = { id: 'tier-child', label: 'Child (5-12)' }

describe('defaultAdultTierId', () => {
    it('picks the first adult tier', () => {
        expect(defaultAdultTierId([ADULT, CHILD])).toBe('tier-adult')
    })

    /* Order on the settings page decides, not the word "Adult" — the label is free text. */
    it('skips child tiers listed first', () => {
        expect(defaultAdultTierId([CHILD, { id: 'tier-senior', label: 'Senior' }])).toBe(
            'tier-senior',
        )
    })

    /* Both fall back to the blank the dropdown already renders as a disabled prompt, so the
       registrant is asked rather than defaulted into a place that does not fit them. */
    it('is blank when every tier is a child tier', () => {
        expect(defaultAdultTierId([CHILD])).toBe('')
    })

    it('is blank for an event with no tiers', () => {
        expect(defaultAdultTierId([])).toBe('')
    })
})
