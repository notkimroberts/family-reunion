import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

/* Shows the open event's program, or the most recent past one once no event is open.

   It used to redirect to `/program/${year}` when nothing was open. No `[year]` route exists,
   so that was a 302 straight into a 404 and the archived program was unreachable by any path.
   The page renders entirely from `data.event`, so a past event needs no separate route —
   only a flag so the copy can say it has already happened. */
export const load: PageServerLoad = async () => {
    const [openEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .limit(1)

    const event =
        openEvent ??
        (await db.select().from(reunionEvents).orderBy(desc(reunionEvents.year)).limit(1))[0]

    if (!event) {
        return { event: null, registrantCount: 0, isPastProgram: false }
    }

    const [{ value: registrantCount }] = await db
        .select({ value: count() })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(and(eq(registrations.eventId, event.id), eq(registrations.status, 'paid')))

    return { event, registrantCount, isPastProgram: !openEvent }
}
