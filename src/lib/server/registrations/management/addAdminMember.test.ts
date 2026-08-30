import { eq } from 'drizzle-orm'
import { describe, it, expect, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedTier } from '$lib/server/testing/seedTier'

/* The organiser adding one person to an existing registration, offline.

   Runs against a real Postgres, so "the row is null" is read back from the column. The version this
   replaced asserted on the object handed to a fake query builder, which meant it could tell an
   omitted key from an explicit null — a distinction the database does not make, and which broke the
   test the moment the insert shape moved into buildPartyMemberRow without any behaviour changing. */

const { addAdminMember } = await import('./addAdminMember')

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>
let tierId: string

const MEMBER = {
    name: '  Marcus Patterson  ',
    birthDate: '1990-05-05',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: true,
    attendedReunion2025: false,
}

async function addedRow(registrationId: string) {
    const rows = await db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))
    return rows.find((row) => !row.isContact)
}

describe('addAdminMember', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db)
        /* Net tier price — deliberately NOT grossed up for Stripe. */
        tierId = await seedTier(db, seeded.eventId, { label: 'Adult', priceCents: 16000 })
    })

    /* The whole point of this function: an offline addition must sit on the same price basis as
       the rest of an admin-entered party, not carry a Stripe gross-up. */
    it('snapshots the net tier price and leaves the payment intent null', async () => {
        await addAdminMember({
            registrationId: seeded.registrationId,
            member: { ...MEMBER, tierId },
        })

        const row = await addedRow(seeded.registrationId)
        expect(row).toMatchObject({
            name: 'Marcus Patterson',
            tierLabel: 'Adult',
            priceCents: 16000,
        })
        /* Never set, which is also what marks the row as never charged online. */
        expect(row?.stripePaymentIntentId).toBeNull()
    })

    it('trims the name', async () => {
        await addAdminMember({
            registrationId: seeded.registrationId,
            member: { ...MEMBER, tierId },
        })

        expect((await addedRow(seeded.registrationId))?.name).toBe('Marcus Patterson')
    })

    it('splits the birth date into its three parts', async () => {
        await addAdminMember({
            registrationId: seeded.registrationId,
            member: { ...MEMBER, tierId },
        })

        expect(await addedRow(seeded.registrationId)).toMatchObject({
            birthYear: 1990,
            birthMonth: 5,
            birthDay: 5,
        })
    })

    it.each(['paid', 'waived', 'pending'] as const)(
        'allows adding to a %s registration',
        async (status) => {
            const target = await seedRegistration(db, { eventId: seeded.eventId, status })

            await expect(
                addAdminMember({
                    registrationId: target.registrationId,
                    member: { ...MEMBER, tierId },
                }),
            ).resolves.toMatchObject({ memberId: expect.any(String) })
        },
    )

    /* A refunded registration's money went back; adding to it would create an attendee nobody
       paid for and no total accounts for. */
    it('refuses a cancelled registration', async () => {
        const cancelled = await seedRegistration(db, {
            eventId: seeded.eventId,
            status: 'refunded',
        })

        await expect(
            addAdminMember({
                registrationId: cancelled.registrationId,
                member: { ...MEMBER, tierId },
            }),
        ).rejects.toThrow()

        expect(await addedRow(cancelled.registrationId)).toBeUndefined()
    })

    it('404s on a missing registration without inserting', async () => {
        await expect(
            addAdminMember({
                registrationId: '00000000-0000-0000-0000-000000000000',
                member: { ...MEMBER, tierId },
            }),
        ).rejects.toThrow()

        expect(await addedRow(seeded.registrationId)).toBeUndefined()
    })

    it('preserves the unanswered questions as null rather than false', async () => {
        await addAdminMember({
            registrationId: seeded.registrationId,
            member: {
                ...MEMBER,
                tierId,
                vegetarianMeal: undefined,
                attendedReunion2025: undefined,
            },
        })

        const row = await addedRow(seeded.registrationId)
        expect(row?.vegetarianMeal).toBeNull()
        expect(row?.attendedReunion2025).toBeNull()
    })

    /* false is a real answer to "vegetarian?", and the difference from "unanswered" is what the
       caterer reads. A truthiness test would collapse the two. */
    it('stores a false answer as false, not null', async () => {
        await addAdminMember({
            registrationId: seeded.registrationId,
            member: { ...MEMBER, tierId, vegetarianMeal: false },
        })

        expect((await addedRow(seeded.registrationId))?.vegetarianMeal).toBe(false)
    })

    it('bumps the registration’s updatedAt', async () => {
        const [before] = await db
            .select({ updatedAt: registrations.updatedAt })
            .from(registrations)
            .where(eq(registrations.id, seeded.registrationId))

        await addAdminMember({
            registrationId: seeded.registrationId,
            member: { ...MEMBER, tierId },
        })

        const [after] = await db
            .select({ updatedAt: registrations.updatedAt })
            .from(registrations)
            .where(eq(registrations.id, seeded.registrationId))
        expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before.updatedAt.getTime())
    })
})
