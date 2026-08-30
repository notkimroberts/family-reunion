import { describe, expect, it } from 'vitest'
import { parseReunionMetadata } from './parseReunionMetadata'

/* The settings page edits all of /program's content as one JSON blob, so this parser is the only
   thing standing between a mistyped paste and a blank program page. The action it replaced caught
   JSON.parse and wrote null, which reported success and destroyed the content — every test here
   exists to pin the opposite behaviour. */

const FULL_METADATA = {
    venue: {
        name: 'Oakstop',
        address: '1721 Broadway, Oakland, CA 94612',
        description: 'Event space in Uptown Oakland.',
    },
    menu: ['BBQ ribs', 'Mac and cheese'],
    drinks: ['Sweet tea'],
    sites: [{ name: 'Lake Merritt', description: 'A short walk away.' }],
    activities: [{ name: 'Family photo' }],
    schedule: [{ day: 'Saturday', time: '9:00 AM', activity: 'Breakfast' }],
}

describe('parseReunionMetadata', () => {
    it('accepts the full shape and returns it unchanged', () => {
        const result = parseReunionMetadata(JSON.stringify(FULL_METADATA))
        expect(result).toEqual({ metadata: FULL_METADATA })
    })

    /* An event in draft has no program content yet, which is the normal starting state — refusing a
       blank textarea would mean the owner could not save the dates until they invented a venue. */
    it.each(['', '   ', '\n\t '])('treats blank input %j as an empty object', (raw) => {
        expect(parseReunionMetadata(raw)).toEqual({ metadata: {} })
    })

    it('accepts an explicitly empty object', () => {
        expect(parseReunionMetadata('{}')).toEqual({ metadata: {} })
    })

    it('accepts a partial object — every key is optional', () => {
        const result = parseReunionMetadata('{"menu":["Cornbread"]}')
        expect(result).toEqual({ metadata: { menu: ['Cornbread'] } })
    })

    it('reports unparseable JSON instead of returning an empty object', () => {
        const result = parseReunionMetadata('{"menu": ["ribs",]}')
        expect(result).toHaveProperty('error')
        expect(result).not.toHaveProperty('metadata')
        if ('error' in result) {
            expect(result.error).toContain('not valid JSON')
        }
    })

    /* The likeliest mistake when hand-editing JSON, and the one a non-strict schema would swallow:
       the save succeeds, the key is dropped, and the program page quietly loses a section. */
    it('rejects an unknown key rather than silently dropping it', () => {
        const result = parseReunionMetadata('{"menus":["ribs"]}')
        expect(result).toHaveProperty('error')
        if ('error' in result) {
            expect(result.error).toContain('menus')
        }
    })

    it('rejects a value of the wrong type and names the path', () => {
        const result = parseReunionMetadata('{"menu":"ribs"}')
        expect(result).toHaveProperty('error')
        if ('error' in result) {
            expect(result.error).toContain('menu')
        }
    })

    it('rejects a schedule entry missing a required field', () => {
        const result = parseReunionMetadata('{"schedule":[{"day":"Saturday","time":"9:00 AM"}]}')
        expect(result).toHaveProperty('error')
        if ('error' in result) {
            expect(result.error).toContain('activity')
        }
    })

    it('rejects a venue with no name', () => {
        const result = parseReunionMetadata('{"venue":{"address":"1721 Broadway"}}')
        expect(result).toHaveProperty('error')
        if ('error' in result) {
            expect(result.error).toContain('name')
        }
    })

    /* JSON.parse happily returns a string, a number or null for valid-but-wrong input, and each one
       would reach db.update as the whole column value. */
    it.each(['"a string"', '42', 'null', '[]'])('rejects non-object JSON %s', (raw) => {
        expect(parseReunionMetadata(raw)).toHaveProperty('error')
    })
})
