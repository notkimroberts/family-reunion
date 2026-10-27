import { rm } from 'node:fs/promises'
import { sql } from './db'
import { E2E_OUTBOX_DIR } from './env'

/* The tier prices every scenario is priced from — what the reunion nets per place. */
export const ADULT_CENTS = 16500
export const CHILD_CENTS = 10000

const DAY_MS = 24 * 60 * 60 * 1000

export type SeededEvent = { eventId: string; adultTierId: string; childTierId: string }

/* Empties every registration table and the outbox, then seeds one open reunion with an Adult and a
   Child tier. Admin accounts and photos survive: the admin is set up once per run (globalSetup).

   `opensAt` defaults to null (open now) and `lockDate` to 60 days ahead; a scenario that needs the
   form closed or not yet open passes its own. */
export async function resetAndSeed(
    options: { opensAt?: Date | null; lockDate?: Date | null } = {},
): Promise<SeededEvent> {
    /* photos is listed because it references reunion_events; the e2e database never holds any. No
       CASCADE, so a new table referencing these fails loudly here instead of being emptied silently. */
    await sql`TRUNCATE registration_audit, party_members, donations, registrations, tiers, photos, reunion_events RESTART IDENTITY`
    await rm(E2E_OUTBOX_DIR, { recursive: true, force: true })

    const now = Date.now()
    const [event] = await sql<{ id: string }[]>`
        INSERT INTO reunion_events
            (year, title, status, start_date, end_date, registration_opens_at, registration_lock_date, metadata)
        VALUES
            (2027, 'Patterson Family Reunion 2027', 'open',
             '2027-07-23T23:00:00Z', '2027-07-25T19:00:00Z',
             ${options.opensAt === undefined ? null : options.opensAt},
             ${options.lockDate === undefined ? new Date(now + 60 * DAY_MS) : options.lockDate},
             ${sql.json({ venue: { name: 'Oakstop', address: '2323 Broadway, Oakland, CA' } })})
        RETURNING id`
    const [adult] = await sql<{ id: string }[]>`
        INSERT INTO tiers (event_id, label, price_cents) VALUES (${event.id}, 'Adult', ${ADULT_CENTS}) RETURNING id`
    const [child] = await sql<{ id: string }[]>`
        INSERT INTO tiers (event_id, label, price_cents) VALUES (${event.id}, 'Child', ${CHILD_CENTS}) RETURNING id`

    return { eventId: event.id, adultTierId: adult.id, childTierId: child.id }
}
