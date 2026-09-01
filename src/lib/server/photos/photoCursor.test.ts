import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { photoCursorAfter, photoCursorBefore } from './_photoCursor'

/* Regression test for a bug that shipped green.

   getPhotoNeighbours interpolated a JS Date into a raw sql`` template. A raw interpolation bypasses
   drizzle's column mapper, so the Date reached the driver unserialised: postgres.js threw "the
   string argument must be of type string ... received an instance of Date" from inside its Bind
   frame, and every photo page 500'd in production.

   The suite runs PGLite, which accepts a Date param without complaint, so NO amount of
   query-executing tests would have caught this — the failure is in the driver, and the test driver
   is not the production driver. Asserting on the PARAMS is driver-independent, which is the whole
   point of testing it here rather than through a query. */

/* A raw SQL object carries no params until a dialect compiles it — which is also exactly the step
   that would have applied a column mapper, had this been a column comparison rather than a raw
   interpolation. */
const dialect = new PgDialect()
const compile = (fragment: ReturnType<typeof photoCursorBefore>) => dialect.sqlToQuery(fragment)

const CREATED_AT = new Date('2025-07-26T18:30:00.000Z')
const ID = 'a9210c76-e894-475b-a93e-35779bacc834'

describe('the photo cursor comparison', () => {
    it.each([
        ['before', photoCursorBefore],
        ['after', photoCursorAfter],
    ])('binds no Date instances (%s)', (_label, build) => {
        const { params } = compile(build(CREATED_AT, ID))

        const dates = params.filter((param) => param instanceof Date)
        expect(dates).toEqual([])
    })

    it.each([
        ['before', photoCursorBefore],
        ['after', photoCursorAfter],
    ])('binds the timestamp as an ISO string (%s)', (_label, build) => {
        const { params } = compile(build(CREATED_AT, ID))

        expect(params).toContain('2025-07-26T18:30:00.000Z')
        expect(params).toContain(ID)
    })

    it('compares the tuple in the right direction', () => {
        expect(compile(photoCursorBefore(CREATED_AT, ID)).sql).toContain('<')
        expect(compile(photoCursorAfter(CREATED_AT, ID)).sql).toContain('>')
    })
})
