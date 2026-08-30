import { eq } from 'drizzle-orm'
import { describe, it, expect, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The single writer of the contact's identity.

   The contact exists twice by design — as registrations.contactName and as the party_members row
   flagged isContact — and this is the only function allowed to move them together. Against a real
   database the test can assert what matters: the two copies agree afterwards. The version this
   replaced could only count writes to a fake keyed by a `__table` marker it invented. */

const { updateRegistrationContact } = await import('./updateRegistrationContact')

let db: Awaited<ReturnType<typeof resetTestDb>>
let seeded: Awaited<ReturnType<typeof seedRegistration>>

async function contactRow() {
    const [row] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, seeded.registrationId))
    return row
}

async function attendeeRow() {
    const rows = await db
        .select()
        .from(partyMembers)
        .where(eq(partyMembers.registrationId, seeded.registrationId))
    return rows.find((row) => row.isContact)
}

describe('updateRegistrationContact', () => {
    beforeEach(async () => {
        db = await resetTestDb()
        seeded = await seedRegistration(db, {
            status: 'pending',
            contactName: 'Alice Patterson',
            contactEmail: 'alice@example.com',
        })
    })

    it('writes the new name to the contact’s attendee row as well', async () => {
        const result = await updateRegistrationContact({
            registrationId: seeded.registrationId,
            contactName: 'Alice Patterson-Jones',
            contactEmail: 'alice@example.com',
            contactPhone: undefined,
        })

        expect(result).toMatchObject({ changed: true })
        /* The whole point: the booking and the attendee row cannot disagree about who this is. */
        expect((await contactRow()).contactName).toBe('Alice Patterson-Jones')
        expect((await attendeeRow())?.name).toBe('Alice Patterson-Jones')
    })

    /* Only on a rename. An email correction must not rewrite an attendee row for no reason. */
    it('leaves the attendee row alone when only the email changed', async () => {
        await updateRegistrationContact({
            registrationId: seeded.registrationId,
            contactName: 'Alice Patterson',
            contactEmail: 'corrected@example.com',
            contactPhone: undefined,
        })

        expect((await contactRow()).contactEmail).toBe('corrected@example.com')
        expect((await attendeeRow())?.name).toBe('Alice Patterson')
    })

    it('normalises before comparing, so whitespace is not a rename', async () => {
        const result = await updateRegistrationContact({
            registrationId: seeded.registrationId,
            contactName: '  Alice Patterson  ',
            contactEmail: 'ALICE@example.com',
            contactPhone: undefined,
        })

        expect(result).toMatchObject({ changed: false })
        expect((await contactRow()).contactEmail).toBe('alice@example.com')
    })

    /* /register/recover matches on exact contact email, so a capitalised address stored as typed is
       a registrant who cannot recover their own link. */
    it('stores a changed email lowercased', async () => {
        await updateRegistrationContact({
            registrationId: seeded.registrationId,
            contactName: 'Alice Patterson',
            contactEmail: '  NEW@Example.COM ',
            contactPhone: undefined,
        })

        expect((await contactRow()).contactEmail).toBe('new@example.com')
    })

    it('reports an email change so the caller can notify the new address', async () => {
        const result = await updateRegistrationContact({
            registrationId: seeded.registrationId,
            contactName: 'Alice Patterson',
            contactEmail: 'new@example.com',
            contactPhone: undefined,
        })

        expect(result).toMatchObject({
            changed: true,
            emailChanged: true,
            previousEmail: 'alice@example.com',
        })
    })

    it('refuses to touch a cancelled registration', async () => {
        const cancelled = await seedRegistration(db, {
            eventId: seeded.eventId,
            status: 'refunded',
            contactName: 'Wanda Trantow',
            contactEmail: 'wanda@example.com',
        })

        await expect(
            updateRegistrationContact({
                registrationId: cancelled.registrationId,
                contactName: 'Anything',
                contactEmail: 'wanda@example.com',
                contactPhone: undefined,
            }),
        ).rejects.toThrow()

        const [row] = await db
            .select()
            .from(registrations)
            .where(eq(registrations.id, cancelled.registrationId))
        expect(row.contactName).toBe('Wanda Trantow')
    })

    it('404s on a registration that does not exist', async () => {
        await expect(
            updateRegistrationContact({
                registrationId: '00000000-0000-0000-0000-000000000000',
                contactName: 'Anything',
                contactEmail: 'nobody@example.com',
                contactPhone: undefined,
            }),
        ).rejects.toThrow()
    })
})
