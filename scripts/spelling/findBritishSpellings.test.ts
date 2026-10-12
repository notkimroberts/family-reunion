import { describe, expect, it } from 'vitest'
import { findBritishSpellings } from './findBritishSpellings'

function diffAdding(file: string, lines: string[], startLine = 1) {
    return [
        `diff --git a/${file} b/${file}`,
        `--- a/${file}`,
        `+++ b/${file}`,
        `@@ -0,0 +${startLine},${lines.length} @@`,
        ...lines.map((line) => `+${line}`),
    ].join('\n')
}

describe('findBritishSpellings', () => {
    it('reports each British word on an added line, with the file, line and American form', () => {
        const found = findBritishSpellings(
            diffAdding('src/a.ts', ['// ok', '/* 2FA enrolment for every organiser */'], 10),
        )

        expect(found).toEqual([
            expect.objectContaining({
                file: 'src/a.ts',
                line: 11,
                british: 'enrolment',
                american: 'enrollment',
            }),
            expect.objectContaining({
                file: 'src/a.ts',
                line: 11,
                british: 'organiser',
                american: 'organizer',
            }),
        ])
    })

    it.each([
        ['enrol', 'enroll'],
        ['Colour', 'color'],
        ['behaviours', 'behaviors'],
        ['recognised', 'recognized'],
        ['normalisation', 'normalization'],
        ['fulfilment', 'fulfillment'],
        ['travelled', 'traveled'],
        ['emphasise', 'emphasize'],
    ])('flags %s as %s', (british, american) => {
        expect(findBritishSpellings(diffAdding('a.md', [`a ${british} b`]))).toEqual([
            expect.objectContaining({ british, american }),
        ])
    })

    /* Words American English shares, and words a suffix rule would have caught. */
    it.each([
        'enrolled',
        'enrolling',
        'enrollment',
        'optimistic',
        'cancelled',
        'promise',
        'exercise',
        'otherwise',
        'hour',
        'emphasis',
        'analyses',
        'fulfill',
    ])('leaves %s alone', (word) => {
        expect(findBritishSpellings(diffAdding('a.md', [`a ${word} b`]))).toEqual([])
    })

    it('catches an identifier or constant that starts with the word', () => {
        const found = findBritishSpellings(
            diffAdding('a.ts', ['const organiserName = 1', 'export const CHEQUE_PAYEE = 2']),
        )

        expect(found.map((spelling) => spelling.british)).toEqual(['organiser', 'CHEQUE'])
    })

    /* A camelCase identifier, e.g. from a library, must not block every line that calls it. */
    it('leaves the word alone inside an identifier', () => {
        expect(findBritishSpellings(diffAdding('a.ts', ['await getPhotoNeighbours(id)']))).toEqual(
            [],
        )
    })

    it('checks only added lines, and skips generated files and marked lines', () => {
        const diff = [
            '--- a/a.md',
            '+++ b/a.md',
            '@@ -1 +1 @@',
            '-the organiser said',
            '+the organizer said',
            diffAdding('bun.lock', ['"colour": "1.0.0"']),
            diffAdding('drizzle/meta/0024_snapshot.json', ['"colour"']),
            diffAdding('b.md', ['Royal Theatre (spelling-ignore)']),
        ].join('\n')

        expect(findBritishSpellings(diff)).toEqual([])
    })

    it('counts lines from each hunk header', () => {
        const diff = [
            '--- a/a.md',
            '+++ b/a.md',
            '@@ -3,0 +4,1 @@',
            '+fine',
            '@@ -9,0 +20,2 @@',
            '+fine',
            '+a cheque',
        ].join('\n')

        expect(findBritishSpellings(diff)).toEqual([
            expect.objectContaining({
                file: 'a.md',
                line: 21,
                british: 'cheque',
                american: 'check',
            }),
        ])
    })
})
