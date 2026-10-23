import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { donations, partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { purgeTestRegistrations } from './purgeTestRegistrations'

let db: Awaited<ReturnType<typeof resetTestDb>>

/* One test booking with a gift, one real card booking, one paper entry and one standalone test
   gift — the mix production holds after a round of preview testing. */
async function seedMix() {
    const testBooking = await seedRegistration(db, {
        stripeSessionId: 'cs_test_booking',
        contactEmail: 'tester@example.com',
    })
    const eventId = testBooking.eventId
    const realBooking = await seedRegistration(db, { eventId, stripeSessionId: 'cs_live_booking' })
    const paperEntry = await seedRegistration(db, { eventId, stripeSessionId: null })
    await db.insert(donations).values([
        {
            eventId,
            registrationId: testBooking.registrationId,
            donorName: 'Tester',
            donorEmail: 'tester@example.com',
            amountCents: 5000,
            status: 'paid',
        },
        {
            eventId,
            donorName: 'Test gift',
            donorEmail: 'gift@example.com',
            amountCents: 2500,
            status: 'paid',
            stripeSessionId: 'cs_test_gift',
        },
        {
            eventId,
            donorName: 'Real gift',
            donorEmail: 'real@example.com',
            amountCents: 2500,
            status: 'paid',
            stripeSessionId: 'cs_live_gift',
        },
    ])
    return { testBooking, realBooking, paperEntry }
}

describe('purgeTestRegistrations', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('lists the test bookings and gifts, and deletes nothing without confirm', async () => {
        const { testBooking } = await seedMix()

        const found = await purgeTestRegistrations(db, { confirm: false })

        expect(found.deleted).toBe(false)
        expect(found.registrations.map((row) => row.id)).toEqual([testBooking.registrationId])
        expect(found.donations.map((row) => row.donorName).sort()).toEqual(['Test gift', 'Tester'])
        expect(await db.select().from(registrations)).toHaveLength(3)
        expect(await db.select().from(donations)).toHaveLength(3)
    })

    it('with confirm, deletes them and their attendees, and keeps everything real', async () => {
        const { testBooking, realBooking, paperEntry } = await seedMix()

        await purgeTestRegistrations(db, { confirm: true })

        expect((await db.select().from(registrations)).map((row) => row.id).sort()).toEqual(
            [realBooking.registrationId, paperEntry.registrationId].sort(),
        )
        expect(
            await db
                .select()
                .from(partyMembers)
                .where(eq(partyMembers.registrationId, testBooking.registrationId)),
        ).toHaveLength(0)
        expect((await db.select().from(donations)).map((row) => row.donorName)).toEqual([
            'Real gift',
        ])
    })

    it('finds nothing when there is nothing to purge', async () => {
        await seedRegistration(db, { stripeSessionId: 'cs_live_only' })

        expect(await purgeTestRegistrations(db, { confirm: true })).toEqual({
            registrations: [],
            donations: [],
            deleted: true,
        })
        expect(await db.select().from(registrations)).toHaveLength(1)
    })
})
