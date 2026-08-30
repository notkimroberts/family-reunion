import { eq } from 'drizzle-orm'
import { describe, it, expect, beforeEach } from 'vitest'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedTier } from '$lib/server/testing/seedTier'

/* Admin paper entry: a registration recorded from a form someone posted, with no Stripe anywhere.

   The contract that separates it from the public path is the price basis. Nothing was charged, so
   there is no gross-up — the tier's net price is what the row stores. Getting this wrong would
   overstate every total on the admin panel by the fee on money Stripe never took. */

const { createAdminRegistration } = await import('./createAdminRegistration')

let db: Awaited<ReturnType<typeof resetTestDb>>
let eventId: string
let adultTierId: string
let childTierId: string

async function membersOf(registrationId: string) {
    return db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, registrationId))
        .orderBy(partyMembers.name)
}

describe('createAdminRegistration', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        eventId = await seedEvent(db, { title: 'Reunion 2027' })
        adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: 16000 })
        childTierId = await seedTier(db, eventId, { label: 'Child', priceCents: 9000 })
    })

    function create(overrides: Record<string, unknown> = {}) {
        return createAdminRegistration({
            eventId,
            contactName: 'Wanda Trantow',
            contactEmail: 'wanda@example.com',
            status: 'paid',
            members: [
                { name: '  Wanda Trantow  ', tierId: adultTierId, birthDate: '1975-11-30' },
                { name: 'Junior Trantow', tierId: childTierId },
            ],
            ...overrides,
        })
    }

    /* The distinction from the public path. Nothing was charged, so nothing is grossed up. */
    it('snapshots the net tier price, never a Stripe gross-up', async () => {
        const result = await create()

        const members = await membersOf(result.registrationId)
        expect(members.map((row) => row.priceCents).sort((a, b) => a - b)).toEqual([9000, 16000])
    })

    /* The caller puts the contact first, and only that row may be flagged. */
    it('flags the first member as the contact and no one else', async () => {
        const result = await create()

        const members = await membersOf(result.registrationId)
        expect(members.filter((row) => row.isContact).map((row) => row.name)).toEqual([
            'Wanda Trantow',
        ])
    })

    it('records the status the organiser chose', async () => {
        const result = await create({ status: 'waived' })

        const [row] = await db
            .select({
                status: registrations.status,
                stripeSessionId: registrations.stripeSessionId,
            })
            .from(registrations)
            .where(eq(registrations.id, result.registrationId))
        expect(row.status).toBe('waived')
        /* No Stripe session is what later tells the totals panel this money arrived by hand. */
        expect(row.stripeSessionId).toBeNull()
    })

    it('trims names and splits the birth date', async () => {
        const result = await create()

        const members = await membersOf(result.registrationId)
        expect(members.map((row) => row.name)).toEqual(['Junior Trantow', 'Wanda Trantow'])
        expect(members.find((row) => row.isContact)).toMatchObject({
            birthYear: 1975,
            birthMonth: 11,
            birthDay: 30,
        })
    })

    it('leaves an absent birth date entirely null', async () => {
        const result = await create()

        const junior = (await membersOf(result.registrationId)).find(
            (row) => row.name === 'Junior Trantow',
        )
        expect(junior).toMatchObject({ birthYear: null, birthMonth: null, birthDay: null })
    })

    it('returns the plaintext token while storing only its hash', async () => {
        const result = await create()

        const [row] = await db
            .select({ managementToken: registrations.managementToken })
            .from(registrations)
            .where(eq(registrations.id, result.registrationId))
        expect(row.managementToken).not.toBe(result.managementToken)
        expect(row.managementToken).toHaveLength(64)
    })
})
