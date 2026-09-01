import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* Handing over a shirt at the door. Its own column, so the assertions are about it NOT disturbing the
   arrival beside it — the two facts come apart on the day and must come apart in the row. */

const { setShirtGiven } = await import('./setShirtGiven')
const { setMemberCheckedIn } = await import('./setMemberCheckedIn')

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>
let memberId: string

async function memberRow() {
    const [row] = await db.select().from(partyMembers).where(eq(partyMembers.id, memberId))
    return row
}

describe('setShirtGiven', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db, {
            members: [{ name: 'Alice Patterson', priceCents: 16000 }],
        })
        memberId = seeded.memberIds[0]
    })

    it('records the handover', async () => {
        await setShirtGiven({ memberId, eventId: seeded.eventId, given: true })

        expect((await memberRow()).shirtGivenAt).toBeInstanceOf(Date)
    })

    it('takes it back on the second tap', async () => {
        await setShirtGiven({ memberId, eventId: seeded.eventId, given: true })
        await setShirtGiven({ memberId, eventId: seeded.eventId, given: false })

        expect(await memberRow()).toMatchObject({ shirtGivenAt: null })
    })

    /* The point of the separate column. A shirt handed over must not imply an arrival, and clearing one
       must not clear the other: a box arriving late means everyone present has a tick and no shirt. */
    it('leaves the arrival alone in both directions', async () => {
        await setMemberCheckedIn({
            memberId,
            eventId: seeded.eventId,
            checkedIn: true,
            adminId: 'user_door',
        })

        await setShirtGiven({ memberId, eventId: seeded.eventId, given: true })
        await setShirtGiven({ memberId, eventId: seeded.eventId, given: false })

        const row = await memberRow()
        expect(row.checkedInAt).toBeInstanceOf(Date)
        expect(row.checkedInBy).toBe('user_door')
    })

    it('records a handover for somebody with no size on file', async () => {
        expect((await memberRow()).shirtSize).toBeNull()

        await setShirtGiven({ memberId, eventId: seeded.eventId, given: true })

        expect((await memberRow()).shirtGivenAt).toBeInstanceOf(Date)
    })

    it('404s and writes nothing for an attendee of a different event', async () => {
        const otherEventId = await seedEvent(db, { year: 2025, status: 'closed' })

        await expect(
            setShirtGiven({ memberId, eventId: otherEventId, given: true }),
        ).rejects.toMatchObject({ status: 404 })

        expect(await memberRow()).toMatchObject({ shirtGivenAt: null })
    })
})
