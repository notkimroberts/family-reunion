import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { donations, partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* Pay, Back, Pay again: the second press replaces the booking the first one opened. Stripe is
   mocked; the database is real, so what is pinned is which rows survive. */

const { mockExpire, mockReportError } = vi.hoisted(() => ({
    mockExpire: vi.fn(),
    mockReportError: vi.fn(),
}))
vi.mock('$lib/server/payments', () => ({ expireCheckoutSession: mockExpire }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { retirePendingCheckout } = await import('./_retirePendingCheckout')

let db: Awaited<ReturnType<typeof resetTestDb>>

async function seedPending(sessionId = 'cs_old') {
    const seeded = await seedRegistration(db, { status: 'pending', stripeSessionId: sessionId })
    await db.insert(donations).values({
        eventId: seeded.eventId,
        registrationId: seeded.registrationId,
        donorName: 'Alice Patterson',
        donorEmail: 'alice@example.com',
        amountCents: 5000,
        status: 'pending',
        stripeSessionId: sessionId,
    })
    return seeded
}

async function registrationExists(id: string) {
    return (await db.select().from(registrations).where(eq(registrations.id, id))).length === 1
}

describe('retirePendingCheckout', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        db = await resetTestDb()
    })

    it('expires the old session and deletes its booking, people and gift', async () => {
        mockExpire.mockResolvedValue('expired')
        const old = await seedPending()

        await retirePendingCheckout(old.viewToken, old.eventId)

        expect(mockExpire).toHaveBeenCalledWith('cs_old')
        expect(await registrationExists(old.registrationId)).toBe(false)
        expect(await db.select().from(partyMembers)).toHaveLength(0)
        expect(await db.select().from(donations)).toHaveLength(0)
    })

    /* Paid on Stripe, webhook not here yet: the row is about to become a real booking. */
    it('keeps a booking whose session already took payment', async () => {
        mockExpire.mockResolvedValue('complete')
        const old = await seedPending()

        await retirePendingCheckout(old.viewToken, old.eventId)

        expect(await registrationExists(old.registrationId)).toBe(true)
        expect(await db.select().from(donations)).toHaveLength(1)
    })

    /* Stripe refusing the expire is what a payment landing at that moment looks like. */
    it('keeps the booking and reports when the expire fails', async () => {
        mockExpire.mockRejectedValue(new Error('session is not open'))
        const old = await seedPending()

        await retirePendingCheckout(old.viewToken, old.eventId)

        expect(await registrationExists(old.registrationId)).toBe(true)
        expect(mockReportError).toHaveBeenCalledOnce()
    })

    /* Same browser, second household: the first booking is paid and must not be touched. */
    it('ignores a booking that is no longer pending', async () => {
        const paid = await seedRegistration(db, { status: 'paid' })

        await retirePendingCheckout(paid.viewToken, paid.eventId)

        expect(mockExpire).not.toHaveBeenCalled()
        expect(await registrationExists(paid.registrationId)).toBe(true)
    })

    it('ignores a token for another reunion', async () => {
        const old = await seedPending()
        const other = await seedRegistration(db, { eventStatus: 'closed' })

        await retirePendingCheckout(old.viewToken, other.eventId)

        expect(mockExpire).not.toHaveBeenCalled()
        expect(await registrationExists(old.registrationId)).toBe(true)
    })

    it('ignores a token that names nothing', async () => {
        const old = await seedPending()

        await retirePendingCheckout('not-a-real-token', old.eventId)

        expect(mockExpire).not.toHaveBeenCalled()
        expect(await registrationExists(old.registrationId)).toBe(true)
    })
})
