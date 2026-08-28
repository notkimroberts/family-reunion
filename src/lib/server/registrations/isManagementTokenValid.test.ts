import { describe, it, expect } from 'vitest'
import {
    isManagementTokenValid,
    MANAGEMENT_TOKEN_GRACE_PERIOD_MS,
    type ManagementTokenColumns,
} from './isManagementTokenValid'

/* This predicate is the whole authorisation check for the registrant-facing surface: it decides who
   may view a party, change its details, remove someone, and trigger a refund. There is no session
   behind it. So the expiry has to be exercised directly — a grace period that never ends is
   indistinguishable from a working one until an old link is used months later. */

const CURRENT = 'hash-current'
const PREVIOUS = 'hash-previous'
const NOW = new Date('2026-08-24T12:00:00Z')

function row(overrides: Partial<ManagementTokenColumns> = {}): ManagementTokenColumns {
    return {
        managementToken: CURRENT,
        previousManagementToken: null,
        previousTokenExpiresAt: null,
        ...overrides,
    }
}

describe('isManagementTokenValid', () => {
    it('accepts the current token', () => {
        expect(isManagementTokenValid(row(), CURRENT, NOW)).toBe(true)
    })

    it('rejects an unknown token', () => {
        expect(isManagementTokenValid(row(), 'hash-nope', NOW)).toBe(false)
    })

    it('accepts the previous token while inside the grace period', () => {
        const rotated = row({
            previousManagementToken: PREVIOUS,
            previousTokenExpiresAt: new Date(NOW.getTime() + 60_000),
        })
        expect(isManagementTokenValid(rotated, PREVIOUS, NOW)).toBe(true)
    })

    /* The one that matters. Without an expiry comparison every rotated token stays valid forever,
       which silently defeats rotation — and rotation is what re-issuing a link relies on. */
    it('REJECTS the previous token once the grace period has passed', () => {
        const expired = row({
            previousManagementToken: PREVIOUS,
            previousTokenExpiresAt: new Date(NOW.getTime() - 1),
        })
        expect(isManagementTokenValid(expired, PREVIOUS, NOW)).toBe(false)
    })

    it('rejects at the exact expiry instant rather than allowing it', () => {
        const boundary = row({
            previousManagementToken: PREVIOUS,
            previousTokenExpiresAt: new Date(NOW.getTime()),
        })
        expect(isManagementTokenValid(boundary, PREVIOUS, NOW)).toBe(false)
    })

    /* A previous hash with no expiry cannot be shown to have ever been current, so it must not be
       honoured — fail closed rather than trusting a half-written row. */
    it('rejects a previous token that carries no expiry', () => {
        const noExpiry = row({ previousManagementToken: PREVIOUS, previousTokenExpiresAt: null })
        expect(isManagementTokenValid(noExpiry, PREVIOUS, NOW)).toBe(false)
    })

    it('still accepts the current token after a rotation', () => {
        const rotated = row({
            previousManagementToken: PREVIOUS,
            previousTokenExpiresAt: new Date(NOW.getTime() + MANAGEMENT_TOKEN_GRACE_PERIOD_MS),
        })
        expect(isManagementTokenValid(rotated, CURRENT, NOW)).toBe(true)
    })

    /* Two rotations in a row drop the oldest token immediately: it is no longer in either column.
       Documented behaviour, not an accident — by then the registrant has had two newer links. */
    it('does not honour a token two generations old', () => {
        const twiceRotated = row({
            managementToken: 'hash-newest',
            previousManagementToken: CURRENT,
            previousTokenExpiresAt: new Date(NOW.getTime() + MANAGEMENT_TOKEN_GRACE_PERIOD_MS),
        })
        expect(isManagementTokenValid(twiceRotated, PREVIOUS, NOW)).toBe(false)
    })

    it('grants a week of grace', () => {
        expect(MANAGEMENT_TOKEN_GRACE_PERIOD_MS).toBe(7 * 24 * 60 * 60 * 1000)
    })
})
