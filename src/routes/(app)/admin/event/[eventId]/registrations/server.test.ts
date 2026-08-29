import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Chainable db mock. The action does exactly one select — the ownership lookup — so the queue holds the
   row it should find. */
const { mockDb, selectQueue } = vi.hoisted(() => {
    const selectQueue: unknown[][] = []
    const selectChain = {
        from: () => selectChain,
        innerJoin: () => selectChain,
        where: () => selectChain,
        limit: () => Promise.resolve(selectQueue.shift() ?? []),
    }
    return { mockDb: { select: () => selectChain }, selectQueue }
})

const { mockRequireAdmin, mockUpdateMember, mockAudit, mockNotify } = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockUpdateMember: vi.fn(),
    mockAudit: vi.fn(),
    mockNotify: vi.fn(),
}))

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ partyMembers: {}, registrations: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('$lib/server/auth/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('$lib/server/registrations', () => ({
    getEventPeople: vi.fn(),
    getRegistrationsForEvent: vi.fn(),
    updateAdminMemberDetails: mockUpdateMember,
    recordRegistrationAudit: mockAudit,
    /* Not imported by the action at all. Mocked so that if somebody wires it in later, the test that
       asserts it is never called has something real to assert against. */
    notifyRegistrationUpdated: mockNotify,
}))

const { actions } = await import('./+page.server')

const ADMIN = { id: 'admin-1', role: 'admin' }

function makeEvent(fields: Record<string, string>, eventId = 'evt-1') {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value)
    }
    return {
        request: new Request('http://localhost/admin/event/evt-1/registrations', {
            method: 'POST',
            body,
        }),
        url: new URL('http://localhost/admin/event/evt-1/registrations'),
        params: { eventId },
        locals: { user: ADMIN },
    } as unknown as Parameters<typeof actions.update_person>[0]
}

beforeEach(() => {
    vi.clearAllMocks()
    selectQueue.length = 0
    mockRequireAdmin.mockReturnValue(ADMIN)
    mockUpdateMember.mockResolvedValue({ changed: true, name: 'Marcus Patterson' })
    mockAudit.mockResolvedValue(undefined)
    selectQueue.push([{ registrationId: 'reg-1', eventId: 'evt-1' }])
})

describe('POST /admin/event/[eventId]/registrations update_person', () => {
    it('requires an admin', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' }))
        expect(mockRequireAdmin).toHaveBeenCalled()
    })

    /* THE POINT OF THIS ACTION. The registration detail page's save emails the registrant because it can
       change what they owe and who is in their party; this changes neither. An email per dietary toggle,
       while an organiser fills in eight gaps, would train them to ignore the message that carries their
       only working management link. */
    it('never emails the registrant', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' }))
        expect(mockNotify).not.toHaveBeenCalled()
    })

    it('still audits the change, so it is accountable rather than invisible', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' }))

        expect(mockAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                registrationId: 'reg-1',
                actor: ADMIN,
                action: 'member_updated',
            }),
        )
    })

    it('does not audit when nothing actually changed', async () => {
        mockUpdateMember.mockResolvedValue({ changed: false, name: 'Marcus Patterson' })

        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' }))

        expect(mockAudit).not.toHaveBeenCalled()
    })

    /* Each cell posts one field. Reading a missing key as '' would let a dietary toggle clear the
       birthday in the cell beside it — updateAdminMemberDetails turns birthDate '' into three nulls. */
    it('passes only the field the form actually sent', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' }))

        expect(mockUpdateMember).toHaveBeenCalledWith({
            memberId: 'pm-1',
            birthDate: undefined,
            vegetarianMeal: true,
            attendedReunion2025: undefined,
        })
    })

    it('treats an empty birthDate as a deliberate clear, not as absent', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', birthDate: '' }))

        expect(mockUpdateMember).toHaveBeenCalledWith(expect.objectContaining({ birthDate: '' }))
    })

    /* An unanswered select posts '', which parseYesNo maps to undefined — "leave it alone" rather than a
       guessed No. */
    it('writes nothing for a still-unanswered yes/no', async () => {
        await actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: '' }))

        expect(mockUpdateMember).toHaveBeenCalledWith(
            expect.objectContaining({ vegetarianMeal: undefined }),
        )
    })

    it('rejects a request with no member', async () => {
        const result = await actions.update_person(makeEvent({ vegetarianMeal: 'yes' }))

        expect(result).toMatchObject({ status: 400 })
        expect(mockUpdateMember).not.toHaveBeenCalled()
    })

    /* The URL claims an event, so the action enforces it — otherwise a POST aimed at one year could edit
       an attendee of another. */
    it('404s when the attendee belongs to a different event', async () => {
        selectQueue.length = 0
        selectQueue.push([{ registrationId: 'reg-9', eventId: 'a-different-event' }])

        await expect(
            actions.update_person(makeEvent({ memberId: 'pm-1', vegetarianMeal: 'yes' })),
        ).rejects.toMatchObject({ status: 404 })

        expect(mockUpdateMember).not.toHaveBeenCalled()
    })

    it('404s when the attendee does not exist', async () => {
        selectQueue.length = 0
        selectQueue.push([])

        await expect(
            actions.update_person(makeEvent({ memberId: 'nope', vegetarianMeal: 'yes' })),
        ).rejects.toMatchObject({ status: 404 })

        expect(mockUpdateMember).not.toHaveBeenCalled()
    })
})
