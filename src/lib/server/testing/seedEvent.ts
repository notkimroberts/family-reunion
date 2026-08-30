import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '$lib/server/db/schema'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

/* A reunion event to hang registrations and tiers off.

   Defaults to `open`, which is the state every registration path cares about. A test that needs a
   SECOND event must give it another status: `one_open_event` is a partial unique index and there is
   only ever one open reunion. */
export async function seedEvent(
    db: TestDb,
    event: {
        year?: number
        title?: string
        status?: (typeof schema.eventStatusEnum.enumValues)[number]
        registrationLockDate?: Date | null
    } = {},
) {
    const [row] = await db
        .insert(schema.reunionEvents)
        .values({
            year: event.year ?? 2027,
            title: event.title ?? 'Patterson Family Reunion 2027',
            status: event.status ?? 'open',
            registrationLockDate: event.registrationLockDate ?? null,
        })
        .returning({ id: schema.reunionEvents.id })
    return row.id
}
