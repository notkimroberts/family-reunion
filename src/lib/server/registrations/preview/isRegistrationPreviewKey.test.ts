import { describe, expect, it } from 'vitest'
import { isRegistrationPreviewKey } from './isRegistrationPreviewKey'

const KEY = 'a'.repeat(32)

describe('isRegistrationPreviewKey', () => {
    it('accepts the configured key', () => {
        expect(isRegistrationPreviewKey(KEY, KEY)).toBe(true)
    })

    it.each([
        ['a wrong key', 'b'.repeat(32), KEY],
        ['a prefix of the key', KEY.slice(0, 31), KEY],
        ['no candidate', undefined, KEY],
        ['an empty candidate', '', KEY],
        ['no configured key', KEY, undefined],
        ['an empty configured key', '', ''],
    ])('refuses %s', (_case, candidate, configured) => {
        expect(isRegistrationPreviewKey(candidate, configured)).toBe(false)
    })

    /* A short value on Railway turns the preview off rather than making it guessable. */
    it('refuses every candidate when the configured key is too short', () => {
        expect(isRegistrationPreviewKey('short', 'short')).toBe(false)
    })
})
