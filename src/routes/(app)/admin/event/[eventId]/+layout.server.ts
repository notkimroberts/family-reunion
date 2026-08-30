import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import type { LayoutServerLoad } from './$types'

/* Postgres rejects a malformed uuid before any row lookup happens. Previously the id only appeared in
   one URL; now it is in every admin URL, so a stale bookmark or a hand-typed path is the normal way to
   hit this — and it must be a 404, not a 500. */
const INVALID_UUID_SYNTAX = '22P02'

function isMalformedUuid(err: unknown): boolean {
    return (
        typeof err === 'object' && err !== null && 'code' in err && err.code === INVALID_UUID_SYNTAX
    )
}

/* Every view under /admin/event/[eventId] is about exactly one reunion. Loading it once here means the
   children never repeat the lookup, and the status banner is rendered once for all of them. */
export const load: LayoutServerLoad = async (event) => {
    requireAdmin(event)

    let found
    try {
        ;[found] = await db
            .select({
                id: reunionEvents.id,
                year: reunionEvents.year,
                title: reunionEvents.title,
                status: reunionEvents.status,
                registrationLockDate: reunionEvents.registrationLockDate,
            })
            .from(reunionEvents)
            .where(eq(reunionEvents.id, event.params.eventId))
            .limit(1)
    } catch (err) {
        if (isMalformedUuid(err)) {
            throw error(404, 'Event not found')
        }
        throw err
    }

    if (!found) {
        throw error(404, 'Event not found')
    }

    return { event: found }
}
