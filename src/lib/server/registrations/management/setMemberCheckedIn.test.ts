import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The one write the check-in page makes.

   Against a real Postgres rather than a fake, because every assertion here is about the ROW: a tick
   that reports success while writing nothing, or one that writes to another year's attendee, both
   look identical from the call site. */

const { setMemberCheckedIn } = await import('./setMemberCheckedIn')

const DOOR_ADMIN = 'user_door'

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>
let memberId: string

async function memberRow(id = memberId) {
    const [row] = await db.select().from(partyMembers).where(eq(partyMembers.id, id))
    return row
}

describe('setMemberCheckedIn', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice Patterson', priceCents: 16000 },
                { name: 'Marcus Patterson', priceCents: 16000 },
            ],
        })
        memberId = seeded.memberIds[1]
    })

    it('records an arrival with the admin who took it', async () => {
        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: true,
            adminId: DOOR_ADMIN,
        })

        const row = await memberRow()
        expect(row.checkedInAt).toBeInstanceOf(Date)
        expect(row.checkedInBy).toBe(DOOR_ADMIN)
    })

    /* The tick is a toggle, not a one-way latch. A greeter will tap the wrong Jackson, and if undoing
       it is not as cheap as doing it the arrived count becomes fiction. */
    it('clears the arrival on the second tap', async () => {
        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: true,
            adminId: DOOR_ADMIN,
        })

        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: false,
            adminId: DOOR_ADMIN,
        })

        expect(await memberRow()).toMatchObject({ checkedInAt: null, checkedInBy: null })
    })

    /* Ticking the same person twice is what two greeters at two doors will do. Both mean "arrived",
       so the later write simply wins — it must not error. */
    it('is idempotent when two greeters tick the same person', async () => {
        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: true,
            adminId: DOOR_ADMIN,
        })
        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: true,
            adminId: 'user_other_door',
        })

        expect(await memberRow()).toMatchObject({ checkedInBy: 'user_other_door' })
    })

    /* The URL claims a year, so the write enforces it. The member id arrives from the client, and
       without this check a request aimed at one reunion could tick an attendee of another. */
    it('404s and writes nothing for an attendee of a different event', async () => {
        const otherEventId = await seedEvent(db, { year: 2025, status: 'closed' })

        await expect(
            setMemberCheckedIn({
                memberId,
                eventId: otherEventId,
                checkedIn: true,
                adminId: DOOR_ADMIN,
            }),
        ).rejects.toMatchObject({ status: 404 })

        expect(await memberRow()).toMatchObject({ checkedInAt: null })
    })

    it('404s for a member id that does not exist', async () => {
        await expect(
            setMemberCheckedIn({
                memberId: '00000000-0000-0000-0000-000000000000',
                eventId: seeded.eventId,
                checkedIn: true,
                adminId: DOOR_ADMIN,
            }),
        ).rejects.toMatchObject({ status: 404 })
    })
})
