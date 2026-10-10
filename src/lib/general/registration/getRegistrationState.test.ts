import { describe, expect, it } from 'vitest'
import { getRegistrationState } from './getRegistrationState'

const OPENS_AT = new Date('2026-10-31T09:00:00-07:00')
const CLOSES_AT = new Date('2027-06-23T09:00:00-07:00')
const BEFORE = new Date('2026-10-09T12:00:00-07:00')
const BETWEEN = new Date('2027-01-01T12:00:00-08:00')
const AFTER = new Date('2027-07-01T12:00:00-07:00')

const window = { registrationOpensAt: OPENS_AT, registrationLockDate: CLOSES_AT }

describe('getRegistrationState', () => {
    it('is scheduled while an open year waits for its opening date', () => {
        expect(getRegistrationState({ status: 'open', ...window }, BEFORE)).toBe('scheduled')
    })

    it('is open between the two dates', () => {
        expect(getRegistrationState({ status: 'open', ...window }, BETWEEN)).toBe('open')
    })

    it('is closed by date once the closing date passes, though the status says open', () => {
        expect(getRegistrationState({ status: 'open', ...window }, AFTER)).toBe('closedByDate')
    })

    it('is open with no dates at all', () => {
        expect(
            getRegistrationState(
                { status: 'open', registrationOpensAt: null, registrationLockDate: null },
                AFTER,
            ),
        ).toBe('open')
    })

    it('ignores the dates for every status but open', () => {
        for (const status of ['draft', 'closed', 'archived'] as const) {
            for (const at of [BEFORE, BETWEEN, AFTER]) {
                expect(getRegistrationState({ status, ...window }, at)).toBe(status)
            }
        }
    })
})
