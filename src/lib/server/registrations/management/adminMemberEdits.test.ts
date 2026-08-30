import { eq } from 'drizzle-orm'
import { describe, it, expect, beforeEach } from 'vitest'
import { partyMembers } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { seedTier } from '$lib/server/testing/seedTier'

/* The two admin edits to somebody else's party: correcting a member's details, and removing one.

   Both are guarded by what the registration has already been paid, so both are tested against a
   real Postgres — the refusals are only worth anything if the row really is untouched afterwards.
   The version this replaced counted calls on a fake `delete()` that deleted nothing. */

const { updateAdminMemberDetails } = await import('./updateAdminMemberDetails')
const { removeAdminMember } = await import('./removeAdminMember')

const ADULT_NET = 16000
const CHILD_NET = 10000

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>
let eventId: string
let adultTierId: string
let childTierId: string

/* The guest, not the contact — index 1 of the seeded party. */
let memberId: string

async function memberRow(id = memberId) {
    const [row] = await db.select().from(partyMembers).where(eq(partyMembers.id, id))
    return row
}

async function partySize() {
    return (
        await db
            .select()
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, seeded.registrationId))
    ).length
}

/* One reunion per test, reused by every party in it: only one event may be `open` at a time, and
   the constraint enforces it. */
async function seedEventAndTiers() {
    eventId = await seedEvent(db)
    adultTierId = await seedTier(db, eventId, { label: 'Adult', priceCents: ADULT_NET })
    childTierId = await seedTier(db, eventId, { label: 'Child', priceCents: CHILD_NET })
}

async function seedParty(status: 'pending' | 'paid' | 'refunded' | 'waived' = 'pending', size = 3) {
    seeded = await seedRegistration(db, {
        eventId,
        status,
        members: Array.from({ length: size }, (_, index) => ({
            name: index === 0 ? 'Alice Patterson' : `Guest ${index}`,
            priceCents: ADULT_NET,
            tierLabel: 'Adult',
        })),
    })
    memberId = seeded.memberIds[1]
}

describe('updateAdminMemberDetails', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        await seedEventAndTiers()
        await seedParty()
    })

    it('corrects a birth date without touching the price', async () => {
        const result = await updateAdminMemberDetails({ memberId, birthDate: '1990-05-05' })

        expect(result).toMatchObject({ changed: true })
        expect(await memberRow()).toMatchObject({
            birthYear: 1990,
            birthMonth: 5,
            birthDay: 5,
            priceCents: ADULT_NET,
        })
    })

    /* Only fields the caller passed may be written. The edit form renders no shirt select when the
       event has shirts disabled, so a blanket write would silently null a saved size. */
    it('leaves fields the caller did not pass alone', async () => {
        await updateAdminMemberDetails({ memberId, shirtSize: 'L', vegetarianMeal: true })

        await updateAdminMemberDetails({ memberId, name: 'Marcus Patterson Jr' })

        expect(await memberRow()).toMatchObject({
            name: 'Marcus Patterson Jr',
            shirtSize: 'L',
            vegetarianMeal: true,
        })
    })

    it('writes nothing when no field was passed', async () => {
        const before = await memberRow()

        const result = await updateAdminMemberDetails({ memberId })

        expect(result).toMatchObject({ changed: false })
        expect(await memberRow()).toEqual(before)
    })

    /* The money guardrail. The tier sets priceCents, so moving it after payment leaves the recorded
       total disagreeing with what Stripe actually took, with no refund issued and nobody told. */
    it('REFUSES a repricing tier change on a paid registration', async () => {
        await seedParty('paid')

        await expect(updateAdminMemberDetails({ memberId, tierId: childTierId })).rejects.toThrow()

        expect(await memberRow()).toMatchObject({ tierLabel: 'Adult', priceCents: ADULT_NET })
    })

    /* The edit form resubmits every field on save, including an unchanged tier. That must not read
       as an attempt to reprice, or a paid registration could never have a typo fixed. */
    it('allows the SAME tier to be resubmitted on a paid registration', async () => {
        await seedParty('paid')

        const result = await updateAdminMemberDetails({
            memberId,
            tierId: adultTierId,
            name: 'Marcus P',
        })

        expect(result).toMatchObject({ changed: true })
        expect((await memberRow()).name).toBe('Marcus P')
    })

    it('allows a tier change while payment is still outstanding', async () => {
        await updateAdminMemberDetails({ memberId, tierId: childTierId })

        expect(await memberRow()).toMatchObject({ tierLabel: 'Child', priceCents: CHILD_NET })
    })

    /* An offline change sits on the same price basis as the rest of an admin-entered party. */
    it('snapshots the NET tier price, never a Stripe gross-up', async () => {
        await updateAdminMemberDetails({ memberId, tierId: childTierId })

        expect((await memberRow()).priceCents).toBe(CHILD_NET)
    })

    it('refuses to touch a cancelled registration', async () => {
        await seedParty('refunded')

        await expect(updateAdminMemberDetails({ memberId, name: 'Anything' })).rejects.toThrow()

        expect((await memberRow()).name).toBe('Guest 1')
    })

    it('404s on an unknown member', async () => {
        await expect(
            updateAdminMemberDetails({
                memberId: '00000000-0000-0000-0000-000000000000',
                name: 'X',
            }),
        ).rejects.toThrow()
    })
})

describe('removeAdminMember', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        await seedEventAndTiers()
        await seedParty()
    })

    it('removes an uncharged member from a party of more than one', async () => {
        const result = await removeAdminMember({ memberId })

        expect(result).toMatchObject({ removed: true, name: 'Guest 1' })
        expect(await partySize()).toBe(2)
    })

    /* removeMember refunds before deleting, keyed so retries cannot double-refund. Deleting here
       without that keeps the money and drops the attendee. */
    it('REFUSES to remove from a paid registration', async () => {
        await seedParty('paid')

        await expect(removeAdminMember({ memberId })).rejects.toThrow()

        expect(await partySize()).toBe(3)
    })

    /* An empty registration is a row nothing can act on, and it vanishes from every member-joined
       report while still counting as a registration. */
    it('REFUSES to remove the last member', async () => {
        await seedParty('pending', 1)

        await expect(removeAdminMember({ memberId: seeded.memberIds[0] })).rejects.toThrow()

        expect(await partySize()).toBe(1)
    })

    it('refuses to touch a cancelled registration', async () => {
        await seedParty('refunded')

        await expect(removeAdminMember({ memberId })).rejects.toThrow()

        expect(await partySize()).toBe(3)
    })

    it('404s on an unknown member', async () => {
        await expect(
            removeAdminMember({ memberId: '00000000-0000-0000-0000-000000000000' }),
        ).rejects.toThrow()

        expect(await partySize()).toBe(3)
    })

    /* The contact's attendee row carries the identity the booking is addressed to, and its name is
       written from registrations.contactName. Deleting it leaves a registration whose contact is not
       in the party — a state nothing else can produce and nothing handles. */
    it('REFUSES to remove the contact’s own place', async () => {
        await expect(removeAdminMember({ memberId: seeded.memberIds[0] })).rejects.toThrow()

        expect(await partySize()).toBe(3)
    })
})
