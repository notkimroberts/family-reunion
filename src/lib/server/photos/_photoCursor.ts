import { sql, type SQL } from 'drizzle-orm'
import { photos } from '$lib/server/db/schema'

/* The (createdAt, id) row comparison that orders the gallery walk.

   Extracted so it can be tested for the bug that shipped once: a raw sql`` interpolation bypasses
   drizzle's column mapper, so a JS Date reaches the driver unserialised. postgres.js throws on
   that; PGLite, which the tests run on, does not. Only asserting on the PARAMS catches it, and only
   a named function gives somewhere to assert. */
export function photoCursorBefore(createdAt: Date, id: string): SQL {
    return sql`(${photos.createdAt}, ${photos.id}) < (${createdAt.toISOString()}::timestamptz, ${id}::uuid)`
}

export function photoCursorAfter(createdAt: Date, id: string): SQL {
    return sql`(${photos.createdAt}, ${photos.id}) > (${createdAt.toISOString()}::timestamptz, ${id}::uuid)`
}
