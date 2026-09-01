import { describe, expect, it } from 'vitest'
import { isUuid } from './isUuid'

/* This guard exists because Postgres errors on a malformed uuid instead of returning no rows, so a
   mistyped URL became a 500 and a Sentry report rather than a 404. */

describe('isUuid', () => {
    it('accepts a uuid in either case', () => {
        expect(isUuid('7cf29245-bbce-4167-b22b-ebb2e3a7e836')).toBe(true)
        expect(isUuid('7CF29245-BBCE-4167-B22B-EBB2E3A7E836')).toBe(true)
    })

    it.each([
        ['banana', 'a word'],
        ['', 'empty'],
        ['7cf29245bbce4167b22bebb2e3a7e836', 'no hyphens'],
        ['7cf29245-bbce-4167-b22b-ebb2e3a7e83', 'a character short'],
        ['7cf29245-bbce-4167-b22b-ebb2e3a7e836x', 'a character long'],
        ['7cf29245-bbce-4167-b22b-ebb2e3a7e83g', 'a non-hex character'],
        ["'; drop table photos; --", 'an injection attempt'],
    ])('rejects %s (%s)', (value) => {
        expect(isUuid(value)).toBe(false)
    })
})
