import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { isUuid } from '$lib/general/ids'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'
import { getEventPeople, getRegistrationsForEvent } from '$lib/server/registrations'
import { toCsv } from '$lib/utils'
import type { RequestHandler } from './$types'
import { bookingsCsvColumnsValue } from './bookingsCsvColumnsValue'
import { peopleCsvColumnsValue } from './peopleCsvColumnsValue'

/* Each export renders one lens's rows. */
const exportsValue = {
    people: async (eventId: string) => toCsv(peopleCsvColumnsValue, await getEventPeople(eventId)),
    bookings: async (eventId: string) =>
        toCsv(bookingsCsvColumnsValue, await getRegistrationsForEvent(eventId)),
}

function isExportKind(kind: string): kind is keyof typeof exportsValue {
    return Object.hasOwn(exportsValue, kind)
}

/* A spreadsheet of one reunion's people or bookings.

   requireAdmin HERE, not in a layout: a +server.ts is reached without any layout load running, so
   this call is the whole protection for a file full of names, emails and home towns. no-store so no
   cache between the organizer and the server keeps a copy. */
export const GET: RequestHandler = async (event) => {
    requireAdmin(event)

    const { eventId, kind } = event.params
    if (!isExportKind(kind) || !isUuid(eventId)) {
        throw error(404, 'Not found')
    }

    const [found] = await db
        .select({ year: reunionEvents.year })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    if (!found) {
        throw error(404, 'Event not found')
    }

    return new Response(await exportsValue[kind](eventId), {
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="reunion-${found.year}-${kind}.csv"`,
            'cache-control': 'private, no-store',
        },
    })
}
