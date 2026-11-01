import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it } from 'vitest'
import { donations, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { handleExpiredCheckout } from './handleExpiredCheckout'

let db: Awaited<ReturnType<typeof resetTestDb>>

function expiredSession(sessionId: string, registrationId: string, viewToken: string) {
    return {
        id: sessionId,
        metadata: { type: 'registration', registrationId, viewToken },
    } as unknown as Stripe.Checkout.Session
}

async function registrationExists(id: string) {
    return (await db.select().from(registrations).where(eq(registrations.id, id))).length === 1
}

describe('handleExpiredCheckout', () => {
    beforeEach(async () => {
        db = await resetTestDb()
    })

    it('deletes an expired booking, and its gift, when the same email paid on another try', async () => {
        const paid = await seedRegistration(db, { status: 'paid' })
        const abandoned = await seedRegistration(db, {
            eventId: paid.eventId,
            status: 'pending',
            stripeSessionId: 'cs_gone',
            contactEmail: 'Alice@Example.com',
        })
        await db.insert(donations).values({
            eventId: paid.eventId,
            registrationId: abandoned.registrationId,
            donorName: 'Alice Patterson',
            donorEmail: 'alice@example.com',
            amountCents: 5000,
            status: 'pending',
            stripeSessionId: 'cs_gone',
        })

        await handleExpiredCheckout(
            expiredSession('cs_gone', abandoned.registrationId, abandoned.viewToken),
        )

        expect(await registrationExists(abandoned.registrationId)).toBe(false)
        expect(await registrationExists(paid.registrationId)).toBe(true)
        expect(await db.select().from(donations)).toHaveLength(0)
    })

    it('deletes an expired booking when that email never paid', async () => {
        const abandoned = await seedRegistration(db, {
            status: 'pending',
            stripeSessionId: 'cs_gone',
        })

        await handleExpiredCheckout(
            expiredSession('cs_gone', abandoned.registrationId, abandoned.viewToken),
        )

        expect(await registrationExists(abandoned.registrationId)).toBe(false)
    })

    it('leaves a paid booking under another email alone', async () => {
        const paid = await seedRegistration(db, {
            status: 'paid',
            contactEmail: 'bob@example.com',
        })
        const abandoned = await seedRegistration(db, {
            eventId: paid.eventId,
            status: 'pending',
            stripeSessionId: 'cs_gone',
        })

        await handleExpiredCheckout(
            expiredSession('cs_gone', abandoned.registrationId, abandoned.viewToken),
        )

        expect(await registrationExists(abandoned.registrationId)).toBe(false)
        expect(await registrationExists(paid.registrationId)).toBe(true)
    })

    /* An organizer marked it paid by check after the checkout was abandoned. */
    it('never deletes a booking that is no longer pending', async () => {
        const settled = await seedRegistration(db, {
            status: 'paid',
            stripeSessionId: 'cs_gone',
        })

        await handleExpiredCheckout(
            expiredSession('cs_gone', settled.registrationId, settled.viewToken),
        )

        expect(await registrationExists(settled.registrationId)).toBe(true)
    })

    it('never deletes a booking that has moved to another session', async () => {
        const moved = await seedRegistration(db, {
            status: 'pending',
            stripeSessionId: 'cs_current',
        })

        await handleExpiredCheckout(
            expiredSession('cs_gone', moved.registrationId, moved.viewToken),
        )

        expect(await registrationExists(moved.registrationId)).toBe(true)
    })

    it('ignores a gift checkout', async () => {
        await handleExpiredCheckout({
            id: 'cs_gift',
            metadata: { type: 'donation', donationId: 'd1' },
        } as unknown as Stripe.Checkout.Session)
    })
})
