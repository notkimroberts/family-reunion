import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The registrant removing one person from their own paid party.

   This had NO test. It is the only path in the app that issues a partial refund, and its ordering is
   load-bearing: refund first, delete only if the refund settled, then mark the registration 'refunded'
   when the last person goes. A refund that fails must leave the member in place — otherwise the
   attendee disappears and the reunion keeps their money.

   Stripe is mocked; the database is real, so "the row is gone" and "the row is still there" are
   assertions rather than a count of calls on a fake. */

const mockRefund = vi.fn()
const mockRetrieveIntent = vi.fn()

vi.mock('$lib/server/payments', () => ({
    refundPaymentIntent: mockRefund,
    retrieveSessionPaymentIntent: mockRetrieveIntent,
}))

const { removeMember } = await import('./removeMember')

let db: Awaited<ReturnType<typeof resetTestDb>>

const TWO_MEMBERS = [
    { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
    { name: 'Marcus Patterson', priceCents: 9500, stripePaymentIntentId: 'pi_1' },
]

async function membersOf(registrationId: string) {
    return db.select().from(partyMembers).where(eq(partyMembers.registrationId, registrationId))
}

async function statusOf(registrationId: string) {
    const [row] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row.status
}

describe('removeMember', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockRefund.mockResolvedValue(undefined)
        mockRetrieveIntent.mockResolvedValue(null)
        db = await resetTestDb()
    })

    it('refunds only that member’s price and deletes the row', async () => {
        const seeded = await seedRegistration(db, { members: TWO_MEMBERS })

        await removeMember(seeded.memberIds[1], seeded.managementToken)

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_1',
            9500,
            `remove-member-${seeded.memberIds[1]}`,
        )
        const remaining = await membersOf(seeded.registrationId)
        expect(remaining.map((row) => row.name)).toEqual(['Alice Patterson'])
    })

    /* The whole reason the refund happens before the delete. */
    it('leaves the member in place when the refund fails', async () => {
        const seeded = await seedRegistration(db, { members: TWO_MEMBERS })
        mockRefund.mockRejectedValueOnce(new Error('card_declined'))

        await expect(removeMember(seeded.memberIds[1], seeded.managementToken)).rejects.toThrow()

        expect(await membersOf(seeded.registrationId)).toHaveLength(2)
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    /* A party of one, cancelled a person at a time, must not be left as a paid registration with
       nobody attending — it would still be counted and still owe a refund nobody is tracking. */
    it('marks the registration refunded when the last member goes', async () => {
        const seeded = await seedRegistration(db)

        await removeMember(seeded.memberIds[0], seeded.managementToken)

        expect(await membersOf(seeded.registrationId)).toHaveLength(0)
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    it('leaves the registration paid while anyone remains', async () => {
        const seeded = await seedRegistration(db, { members: TWO_MEMBERS })

        await removeMember(seeded.memberIds[1], seeded.managementToken)

        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    /* stripePaymentIntentId is null on every member of a registration paid before that column was
       backfilled, so the intent has to come off the checkout session instead. */
    it('falls back to the session intent when the member has none', async () => {
        const seeded = await seedRegistration(db, {
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: null },
                { name: 'Marcus', priceCents: 9500, stripePaymentIntentId: null },
            ],
        })
        mockRetrieveIntent.mockResolvedValueOnce('pi_session')

        await removeMember(seeded.memberIds[1], seeded.managementToken)

        expect(mockRefund).toHaveBeenCalledWith('pi_session', 9500, expect.any(String))
        expect(await membersOf(seeded.registrationId)).toHaveLength(1)
    })

    /* A cheque payer has no Stripe payment anywhere. Removing someone must still work — there is
       simply nothing to send back through Stripe. */
    it('removes without refunding when nothing went through Stripe', async () => {
        const seeded = await seedRegistration(db, {
            stripeSessionId: null,
            members: [
                { name: 'Alice', priceCents: 16509, stripePaymentIntentId: null },
                { name: 'Marcus', priceCents: 9500, stripePaymentIntentId: null },
            ],
        })

        await removeMember(seeded.memberIds[1], seeded.managementToken)

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await membersOf(seeded.registrationId)).toHaveLength(1)
    })

    it('403s on a token belonging to another registration', async () => {
        const seeded = await seedRegistration(db, { members: TWO_MEMBERS })
        const other = await seedRegistration(db, {
            eventId: seeded.eventId,
            contactEmail: 'someone@example.com',
        })

        await expect(
            removeMember(seeded.memberIds[1], other.managementToken),
        ).rejects.toMatchObject({ status: 403 })

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await membersOf(seeded.registrationId)).toHaveLength(2)
    })

    it('403s on an unknown token', async () => {
        const seeded = await seedRegistration(db, { members: TWO_MEMBERS })

        await expect(removeMember(seeded.memberIds[1], 'not-a-real-token')).rejects.toMatchObject({
            status: 403,
        })

        expect(await membersOf(seeded.registrationId)).toHaveLength(2)
    })

    it('refuses once the registration lock date has passed', async () => {
        const seeded = await seedRegistration(db, {
            members: TWO_MEMBERS,
            registrationLockDate: new Date('2020-01-01'),
        })

        await expect(removeMember(seeded.memberIds[1], seeded.managementToken)).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(await membersOf(seeded.registrationId)).toHaveLength(2)
    })
})
