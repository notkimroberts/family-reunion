import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* An organizer settling a place owed on a paid booking: money arrived by Zelle or check, or the
   place is covered. Against a real Postgres, because the guard is the conditional UPDATE. */

const { settleMemberPayment } = await import('./settleMemberPayment')
const { setRegistrationStatus } = await import('./setRegistrationStatus')
const { markRegistrationRefunded } = await import('../lifecycle')

const CHILD_NET = 10000

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>

async function seedOwed(eventId?: string) {
    seeded = await seedRegistration(db, {
        eventId,
        members: [
            { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
            { name: 'Jada Patterson', priceCents: CHILD_NET, tierLabel: 'Child', paymentDue: true },
        ],
    })
}

async function owedRow() {
    const [row] = await db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.id, seeded.memberIds[1]))
    return row
}

function settle(settlement: 'paid' | 'covered', memberId = seeded.memberIds[1]) {
    return settleMemberPayment({ registrationId: seeded.registrationId, memberId, settlement })
}

describe('settleMemberPayment', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        await seedOwed()
    })

    /* Zelle and checks cost no fee, so the net is what arrived. */
    it('marks the place paid and keeps the net price', async () => {
        const result = await settle('paid')

        expect(result).toEqual({ name: 'Jada Patterson' })
        expect(await owedRow()).toMatchObject({
            paymentDue: false,
            priceCents: CHILD_NET,
            settlement: 'paid',
        })
    })

    /* No per-member waived status exists, and a covered place left at its tier price would be
       counted as money banked. */
    it('zeroes the price of a covered place', async () => {
        await settle('covered')

        expect(await owedRow()).toMatchObject({
            paymentDue: false,
            priceCents: 0,
            settlement: 'covered',
        })
    })

    /* Two organizers at once, or a card payment that landed first: the second must not overwrite. */
    it('refuses a place that is no longer owed', async () => {
        await settle('paid')

        await expect(settle('covered')).rejects.toMatchObject({ status: 409 })
        expect((await owedRow()).priceCents).toBe(CHILD_NET)
    })

    it('refuses a person who was never owed', async () => {
        await expect(settle('paid', seeded.memberIds[0])).rejects.toMatchObject({ status: 409 })
    })

    /* The id pair comes from a URL and a form; a member of another booking must not be settled
       through this one. */
    it('refuses a member of a different registration', async () => {
        const other = seeded
        await seedOwed(other.eventId)

        await expect(
            settleMemberPayment({
                registrationId: other.registrationId,
                memberId: seeded.memberIds[1],
                settlement: 'paid',
            }),
        ).rejects.toMatchObject({ status: 409 })
        expect((await owedRow()).paymentDue).toBe(true)
    })

    /* Leaving 'paid' clears the flag, so a place on a pending or cancelled booking is no longer owed
       and there is nothing to settle. */
    it('refuses once the booking has gone pending', async () => {
        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'pending' })

        await expect(settle('paid')).rejects.toMatchObject({ status: 409 })
    })

    it('refuses once the booking has been cancelled', async () => {
        await markRegistrationRefunded(seeded.registrationId)

        await expect(settle('paid')).rejects.toMatchObject({ status: 409 })
    })
})
