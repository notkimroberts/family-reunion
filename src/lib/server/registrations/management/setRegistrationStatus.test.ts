import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* Recording that a paper registration's money arrived, was waived, or is still outstanding.

   Against a real Postgres, so paidAt is read back as a column rather than inspected on the object
   handed to a fake. */

const { setRegistrationStatus } = await import('./setRegistrationStatus')

let db: Awaited<ReturnType<typeof resetTestDb>>

async function rowOf(registrationId: string) {
    const [row] = await db
        .select({ status: registrations.status, paidAt: registrations.paidAt })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row
}

describe('setRegistrationStatus', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    /* The gap this function exists to close: only fulfillCheckout could set 'paid', via Stripe, so
       a paper registration entered as pending was stuck permanently. */
    it('records that a pending paper registration was paid', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'paid' })

        expect((await rowOf(seeded.registrationId)).status).toBe('paid')
    })

    /* paidAt is the only record of WHEN the money arrived. updatedAt cannot answer it — any later edit
       bumps it — so the admin list would otherwise have to print a date that drifts. */
    it('stamps paidAt when the money is recorded as arrived', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'paid' })

        expect((await rowOf(seeded.registrationId)).paidAt).toBeInstanceOf(Date)
    })

    /* Taken back means owed again. A paid date left sitting beside a Pending badge reads as a payment
       that has gone missing, which is worse than no date at all. */
    it('clears paidAt when a paid registration is moved back to pending', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })
        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'paid' })

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'pending' })

        expect(await rowOf(seeded.registrationId)).toMatchObject({
            status: 'pending',
            paidAt: null,
        })
    })

    /* Waived is a place with no payment, so there is no payment date to show. */
    it('leaves paidAt null when a place is waived', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'waived' })

        expect((await rowOf(seeded.registrationId)).paidAt).toBeNull()
    })

    it.each([
        ['pending', 'waived'],
        ['paid', 'pending'],
        ['waived', 'paid'],
    ] as const)('moves %s -> %s', async (from, to) => {
        const seeded = await seedRegistration(db, { status: from })

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: to })

        expect((await rowOf(seeded.registrationId)).status).toBe(to)
    })

    /* Reviving a cancelled party would present a registration as paid when the money went back. */
    it('refuses to move a refunded registration', async () => {
        const seeded = await seedRegistration(db, { status: 'refunded' })

        await expect(
            setRegistrationStatus({ registrationId: seeded.registrationId, status: 'paid' }),
        ).rejects.toThrow()

        expect((await rowOf(seeded.registrationId)).status).toBe('refunded')
    })

    it('404s on a missing registration without writing', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        await expect(
            setRegistrationStatus({
                registrationId: '00000000-0000-0000-0000-000000000000',
                status: 'paid',
            }),
        ).rejects.toThrow()

        expect((await rowOf(seeded.registrationId)).status).toBe('pending')
    })

    /* A no-op must not bump updatedAt either — an organiser re-selecting the status they are already
       on should not move the registration up a list sorted by recency. */
    it('writes nothing when the status already matches', async () => {
        const seeded = await seedRegistration(db, { status: 'paid' })
        const [before] = await db
            .select({ updatedAt: registrations.updatedAt })
            .from(registrations)
            .where(eq(registrations.id, seeded.registrationId))

        await setRegistrationStatus({ registrationId: seeded.registrationId, status: 'paid' })

        const [after] = await db
            .select({ updatedAt: registrations.updatedAt })
            .from(registrations)
            .where(eq(registrations.id, seeded.registrationId))
        expect(after.updatedAt).toEqual(before.updatedAt)
    })
})
