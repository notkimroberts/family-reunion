import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { photos } from '$lib/server/db/schema'
import { photoCursorAfter, photoCursorBefore } from './_photoCursor'

export type PhotoNeighbours = {
    previousId: string | undefined
    nextId: string | undefined
    position: number
    total: number
}

/* The photos either side of this one, so a visitor can walk the gallery without going back to the
   grid between every picture.

   Walks the SAME total order the grid uses — (createdAt, id) descending — via row comparison, which
   Postgres evaluates left to right exactly as the ORDER BY does. Ordering on createdAt alone would
   leave two photos uploaded in the same millisecond in an undefined order, and arrows that disagree
   with the grid skip or loop.

   `year` scopes the walk to the filtered set, so someone browsing 2025 stays inside 2025 rather than
   falling out of it at the boundary.

   Deliberately does NOT wrap around at the ends. Reaching the last photo and being silently returned
   to the first reads as a bug; a disabled arrow says "that is all of them". */
export async function getPhotoNeighbours(
    photoId: string,
    year?: number,
): Promise<PhotoNeighbours | undefined> {
    const scope = (extra?: ReturnType<typeof sql>) =>
        and(
            eq(photos.status, 'approved'),
            year === undefined ? undefined : eq(photos.takenYear, year),
            extra,
        )

    const [current] = await db
        .select({ createdAt: photos.createdAt, id: photos.id })
        .from(photos)
        .where(and(eq(photos.id, photoId), scope()))
        .limit(1)

    if (!current) {
        return undefined
    }

    const older = photoCursorBefore(current.createdAt, current.id)
    const newer = photoCursorAfter(current.createdAt, current.id)

    /* "Next" is further down the grid, i.e. older; "previous" is newer. */
    const [next] = await db
        .select({ id: photos.id })
        .from(photos)
        .where(scope(older))
        .orderBy(desc(photos.createdAt), desc(photos.id))
        .limit(1)

    const [previous] = await db
        .select({ id: photos.id })
        .from(photos)
        .where(scope(newer))
        .orderBy(asc(photos.createdAt), asc(photos.id))
        .limit(1)

    const [{ newerCount }] = await db
        .select({ newerCount: sql<number>`count(*)::int` })
        .from(photos)
        .where(scope(newer))

    const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(photos)
        .where(scope())

    return {
        previousId: previous?.id,
        nextId: next?.id,
        position: newerCount + 1,
        total,
    }
}
