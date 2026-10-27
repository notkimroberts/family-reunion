import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { donations, partyMembers, registrations, stripeFees } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { recordPaymentFee } from './recordPaymentFee'

let db: Awaited<ReturnType<typeof resetTestDb>>

beforeEach(async () => {
    db = await resetTestDb()
})

async function bookingFee(id: string) {
    const [row] = await db.select().from(registrations).where(eq(registrations.id, id))
    return row.stripeFeeCents
}

async function seedGift(values: Partial<typeof donations.$inferInsert>) {
    const [row] = await db
        .insert(donations)
        .values({
            donorName: 'Ruth',
            donorEmail: 'ruth@example.com',
            amountCents: 5000,
            status: 'paid',
            ...values,
        })
        .returning({ id: donations.id })
    return row.id
}

async function giftFee(id: string) {
    const [row] = await db.select().from(donations).where(eq(donations.id, id))
    return row.stripeFeeCents
}

describe('recordPaymentFee', () => {
    it('records a booking’s first charge', async () => {
        const seeded = await seedRegistration(db, { stripePaymentIntentId: 'pi_1' })

        expect(await recordPaymentFee('pi_1', 509)).toBe('recorded')
        expect(await bookingFee(seeded.registrationId)).toBe(509)
    })

    /* Each charge pays its own 2.9% + 30¢. */
    it('adds a later charge for people added to the booking', async () => {
        const seeded = await seedRegistration(db, { stripePaymentIntentId: 'pi_1' })
        await recordPaymentFee('pi_1', 509)
        await db
            .update(partyMembers)
            .set({ stripePaymentIntentId: 'pi_2' })
            .where(eq(partyMembers.id, seeded.memberIds[0]))

        expect(await recordPaymentFee('pi_2', 345)).toBe('recorded')
        expect(await bookingFee(seeded.registrationId)).toBe(854)
    })

    it('counts a payment once, however often it is reported', async () => {
        const seeded = await seedRegistration(db, { stripePaymentIntentId: 'pi_1' })
        await recordPaymentFee('pi_1', 509)

        expect(await recordPaymentFee('pi_1', 509)).toBe('already-recorded')
        expect(await bookingFee(seeded.registrationId)).toBe(509)
    })

    it('puts a standalone gift’s fee on the gift', async () => {
        const giftId = await seedGift({ stripePaymentIntentId: 'pi_gift' })

        expect(await recordPaymentFee('pi_gift', 320)).toBe('recorded')
        expect(await giftFee(giftId)).toBe(320)
    })

    /* One charge, one balance transaction: a gift given with a booking shares its fee with it. */
    it('puts the fee of a booking-and-gift charge on the booking only', async () => {
        const seeded = await seedRegistration(db, { stripePaymentIntentId: 'pi_1' })
        const giftId = await seedGift({
            stripePaymentIntentId: 'pi_1',
            registrationId: seeded.registrationId,
        })

        await recordPaymentFee('pi_1', 896)

        expect(await bookingFee(seeded.registrationId)).toBe(896)
        expect(await giftFee(giftId)).toBeNull()
    })

    /* charge.updated can arrive before the fulfillment that writes the intent. Nothing is written, so
       the fulfillment's own read records it. */
    it('writes nothing for a payment it cannot place yet', async () => {
        expect(await recordPaymentFee('pi_unknown', 509)).toBe('no-match')
        expect(await db.select().from(stripeFees)).toEqual([])

        const seeded = await seedRegistration(db, { stripePaymentIntentId: 'pi_unknown' })
        expect(await recordPaymentFee('pi_unknown', 509)).toBe('recorded')
        expect(await bookingFee(seeded.registrationId)).toBe(509)
    })
})
