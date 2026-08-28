import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The contact is also an attendee, so their name exists twice: registrations.contactName and the
   party_members row flagged isContact. Every attendee needs a name, so that second copy cannot go —
   what makes it safe is that exactly one function writes both.

   Before the flag existed the admin form offered two editable name fields for the same person and they
   drifted in practice: contact "asdf asdf" against attendee "asdf LKA:LKJ:ALSJL:KAJ". */

const { mockSet, mockUpdate, selectQueue } = vi.hoisted(() => ({
    mockSet: vi.fn(),
    mockUpdate: vi.fn(),
    selectQueue: [] as unknown[][],
}))

const mockDb = {
    select: () => {
        const chain = {
            from: () => chain,
            where: () => chain,
            limit: () => Promise.resolve(selectQueue.shift() ?? []),
        }
        return chain
    },
    update: (table: unknown) => {
        mockUpdate(table)
        return {
            set: (values: unknown) => {
                mockSet(table, values)
                return { where: () => Promise.resolve(undefined) }
            },
        }
    },
}

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    registrations: { __table: 'registrations', id: 'id' },
    partyMembers: { __table: 'party_members', id: 'id' },
}))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn() }))

const { updateRegistrationContact } = await import('./updateRegistrationContact')

const EXISTING = {
    status: 'pending',
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: null,
}

function partyMemberWrites() {
    return mockSet.mock.calls.filter(([table]) => table.__table === 'party_members')
}

beforeEach(() => {
    vi.clearAllMocks()
    selectQueue.length = 0
})

describe('updateRegistrationContact', () => {
    it('writes the new name to the contact’s attendee row as well', async () => {
        selectQueue.push([EXISTING])

        const result = await updateRegistrationContact({
            registrationId: 'reg-1',
            contactName: 'Alice Patterson-Jones',
            contactEmail: 'alice@example.com',
            contactPhone: undefined,
        })

        expect(result).toMatchObject({ changed: true })
        expect(partyMemberWrites()).toHaveLength(1)
        expect(partyMemberWrites()[0][1]).toEqual({ name: 'Alice Patterson-Jones' })
    })

    /* Only on a rename. An email correction must not rewrite an attendee row for no reason. */
    it('leaves the attendee row alone when only the email changed', async () => {
        selectQueue.push([EXISTING])

        await updateRegistrationContact({
            registrationId: 'reg-1',
            contactName: 'Alice Patterson',
            contactEmail: 'corrected@example.com',
            contactPhone: undefined,
        })

        expect(partyMemberWrites()).toHaveLength(0)
    })

    it('normalises before comparing, so whitespace is not a rename', async () => {
        selectQueue.push([EXISTING])

        const result = await updateRegistrationContact({
            registrationId: 'reg-1',
            contactName: '  Alice Patterson  ',
            contactEmail: 'ALICE@example.com',
            contactPhone: undefined,
        })

        expect(result).toMatchObject({ changed: false })
        expect(partyMemberWrites()).toHaveLength(0)
    })

    it('reports an email change so the caller can notify the new address', async () => {
        selectQueue.push([EXISTING])

        const result = await updateRegistrationContact({
            registrationId: 'reg-1',
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
        selectQueue.push([{ ...EXISTING, status: 'refunded' }])

        await expect(
            updateRegistrationContact({
                registrationId: 'reg-1',
                contactName: 'Anything',
                contactEmail: 'alice@example.com',
                contactPhone: undefined,
            }),
        ).rejects.toThrow()

        expect(mockUpdate).not.toHaveBeenCalled()
    })
})
