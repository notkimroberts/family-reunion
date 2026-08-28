import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSuperValidate, mockDefaults } = vi.hoisted(() => ({
    mockSuperValidate: vi.fn(),
    mockDefaults: vi.fn(),
}))

const {
    mockRequireAdmin,
    mockAddAdminMember,
    mockSetRegistrationStatus,
    mockReissueManagementLink,
    mockUpdateContact,
    mockUpdateMember,
    mockRemoveMember,
    mockNotify,
    mockAudit,
    mockGetRegistrationWithEvent,
    mockReportError,
} = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockAddAdminMember: vi.fn(),
    mockSetRegistrationStatus: vi.fn(),
    mockReissueManagementLink: vi.fn(),
    mockUpdateContact: vi.fn(),
    mockUpdateMember: vi.fn(),
    mockRemoveMember: vi.fn(),
    mockNotify: vi.fn(),
    mockAudit: vi.fn(),
    mockGetRegistrationWithEvent: vi.fn(),
    mockReportError: vi.fn(),
}))

vi.mock('sveltekit-superforms', () => ({ defaults: mockDefaults }))
vi.mock('sveltekit-superforms/server', () => ({ superValidate: mockSuperValidate }))
vi.mock('sveltekit-superforms/adapters', () => ({ zod4: (s: unknown) => s }))
vi.mock('$lib/server/auth/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('$lib/server/db', () => ({ db: {} }))
vi.mock('$lib/server/db/schema', () => ({ registrationAudit: {}, user: {} }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('$lib/server/tiers', () => ({ getTiersForEvent: vi.fn() }))
vi.mock('drizzle-orm', () => ({ desc: vi.fn(), eq: vi.fn() }))
vi.mock('$lib/server/registrations', () => ({
    addAdminMember: mockAddAdminMember,
    setRegistrationStatus: mockSetRegistrationStatus,
    reissueManagementLink: mockReissueManagementLink,
    updateRegistrationContact: mockUpdateContact,
    updateAdminMemberDetails: mockUpdateMember,
    removeAdminMember: mockRemoveMember,
    notifyRegistrationUpdated: mockNotify,
    recordRegistrationAudit: mockAudit,
    getRegistrationMembers: vi.fn(),
    getRegistrationWithEvent: mockGetRegistrationWithEvent,
}))
vi.mock('./schema', () => ({ adminEditRegistrationSchema: {} }))

const { actions } = await import('./+page.server')

const MEMBER_FORM = {
    name: 'Marcus Patterson',
    tierId: 'tier-adult',
    birthDate: '1990-05-05',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
}

const EDIT_FORM = {
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: '',
    status: 'pending',
    members: [],
    newMembers: [],
    removedMemberIds: [],
}

const STAGED_MEMBER = {
    name: 'Marcus Patterson',
    tierId: 'tier-adult',
    birthDate: '1990-05-05',
    shirtSize: 'L',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'yes',
    attendedReunion2025: 'no',
}

function makeEvent() {
    return {
        request: new Request('http://localhost/admin/registrations/reg-1', { method: 'POST' }),
        url: new URL('http://localhost/admin/registrations/reg-1'),
        params: { id: 'reg-1' },
        locals: { user: { id: 'admin-1', role: 'admin' } },
    } as unknown as Parameters<typeof actions.save>[0]
}

beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockReturnValue({ id: 'admin-1', role: 'admin' })
    mockSuperValidate.mockResolvedValue({ valid: true, data: { ...EDIT_FORM } })
    mockGetRegistrationWithEvent.mockResolvedValue({
        registration: { id: 'reg-1', status: 'pending', eventId: 'evt-1' },
        event: { title: 'Reunion 2027' },
    })
    mockUpdateContact.mockResolvedValue({
        changed: false,
        emailChanged: false,
        previousEmail: 'alice@example.com',
    })
    mockUpdateMember.mockResolvedValue({ changed: false, name: 'Marcus Patterson' })
    mockRemoveMember.mockResolvedValue({ removed: true, name: 'Marcus', registrationId: 'reg-1' })
    mockAddAdminMember.mockResolvedValue({ memberId: 'member-new' })
    mockSetRegistrationStatus.mockResolvedValue(undefined)
    mockReissueManagementLink.mockResolvedValue(undefined)
    mockNotify.mockResolvedValue({ sent: true })
    mockAudit.mockResolvedValue(undefined)
})

describe('POST /admin/registrations/[id] save', () => {
    it('requires an admin', async () => {
        await actions.save(makeEvent())
        expect(mockRequireAdmin).toHaveBeenCalled()
    })

    it('returns 400 without writing anything when validation fails', async () => {
        mockSuperValidate.mockResolvedValue({ valid: false, data: {} })

        const result = await actions.save(makeEvent())

        expect(mockUpdateContact).not.toHaveBeenCalled()
        expect(mockSetRegistrationStatus).not.toHaveBeenCalled()
        expect(result).toMatchObject({ status: 400 })
    })

    /* Nothing changed means nothing to announce. Emailing anyway would train the registrant to ignore
       these, which matters because the same email carries their working link. */
    it('does not email when nothing actually changed', async () => {
        const result = await actions.save(makeEvent())

        expect(mockNotify).not.toHaveBeenCalled()
        expect(result).toMatchObject({ saved: true, notified: false })
    })

    it('records a status change, audits it, and tells the registrant', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...EDIT_FORM, status: 'paid' },
        })

        const result = await actions.save(makeEvent())

        expect(mockSetRegistrationStatus).toHaveBeenCalledWith({
            registrationId: 'reg-1',
            status: 'paid',
        })
        expect(mockAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'status_changed',
                actor: { id: 'admin-1', role: 'admin' },
                detail: { from: 'pending', to: 'paid' },
            }),
        )
        expect(mockNotify).toHaveBeenCalledOnce()
        expect(result).toMatchObject({ saved: true, notified: true })
    })

    it('builds the manage URL from the request origin', async () => {
        mockSuperValidate.mockResolvedValue({ valid: true, data: { ...EDIT_FORM, status: 'paid' } })

        await actions.save(makeEvent())

        const [params] = mockNotify.mock.calls[0]
        expect(params.manageUrl('abc')).toBe('http://localhost/register/manage?token=abc')
    })

    /* Batching is the whole reason this is one action: each notification rotates the management token,
       so three separate ones would leave two dead links in the registrant's inbox. */
    it('sends ONE notification even when several things changed at once', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: {
                ...EDIT_FORM,
                status: 'paid',
                members: [
                    {
                        memberId: 'm-1',
                        name: 'Marcus P',
                        vegetarianMeal: '',
                        attendedReunion2025: '',
                    },
                ],
                removedMemberIds: ['m-2'],
            },
        })
        mockUpdateContact.mockResolvedValue({
            changed: true,
            emailChanged: false,
            previousEmail: 'alice@example.com',
        })
        mockUpdateMember.mockResolvedValue({ changed: true, name: 'Marcus P' })

        const result = await actions.save(makeEvent())

        expect(mockNotify).toHaveBeenCalledOnce()
        const [params] = mockNotify.mock.calls[0]
        expect(params.changeSummary.length).toBeGreaterThan(1)
        expect(result).toMatchObject({ saved: true })
    })

    /* Removals run before edits so a member deleted in this sitting is not also updated — that would
       404 on a row that no longer exists and fail the whole save. */
    it('does not update a member it removed in the same save', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: {
                ...EDIT_FORM,
                members: [
                    { memberId: 'm-1', name: 'Gone', vegetarianMeal: '', attendedReunion2025: '' },
                ],
                removedMemberIds: ['m-1'],
            },
        })

        await actions.save(makeEvent())

        expect(mockRemoveMember).toHaveBeenCalledWith({ memberId: 'm-1' })
        expect(mockUpdateMember).not.toHaveBeenCalled()
    })

    /* A guard refusing — repricing a paid party, emptying a party — has to reach the organiser as its
       own reason. A generic "save failed" leaves them with no idea what to do instead. */
    it('surfaces a guard refusal message rather than a generic failure', async () => {
        mockRemoveMember.mockRejectedValue({
            status: 409,
            body: { message: 'This registration is paid. Removing someone owes them a refund' },
        })
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...EDIT_FORM, removedMemberIds: ['m-1'] },
        })

        const result = await actions.save(makeEvent())

        expect(result).toMatchObject({ status: 409 })
        expect(JSON.stringify(result)).toContain('owes them a refund')
        expect(mockNotify).not.toHaveBeenCalled()
    })

    it('refuses to edit a cancelled registration', async () => {
        mockGetRegistrationWithEvent.mockResolvedValue({
            registration: { id: 'reg-1', status: 'refunded', eventId: 'evt-1' },
            event: { title: 'Reunion 2027' },
        })

        const result = await actions.save(makeEvent())

        expect(result).toMatchObject({ status: 409 })
        expect(mockUpdateContact).not.toHaveBeenCalled()
    })

    /* The change is already committed when the email is attempted. Reporting the save as failed would
       send the organiser back to redo work that actually landed. */
    it('still reports the save as succeeded when the notification fails', async () => {
        mockSuperValidate.mockResolvedValue({ valid: true, data: { ...EDIT_FORM, status: 'paid' } })
        mockNotify.mockRejectedValue(new Error('Resend rejected the email'))

        const result = await actions.save(makeEvent())

        expect(mockReportError).toHaveBeenCalled()
        expect(result).toMatchObject({ saved: true, notified: false })
    })
})

describe('save: staged additions', () => {
    /* Additions used to be their own action with their own immediate write and its own email. Batching
       them into the save is the point: three people added in one sitting must not mean three rotations
       of the management token and three emails. */
    it('adds each staged member through addAdminMember, never Stripe', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...EDIT_FORM, newMembers: [STAGED_MEMBER] },
        })

        await actions.save(makeEvent())

        expect(mockAddAdminMember).toHaveBeenCalledWith({
            registrationId: 'reg-1',
            member: expect.objectContaining({
                name: 'Marcus Patterson',
                tierId: 'tier-adult',
                vegetarianMeal: true,
                attendedReunion2025: false,
            }),
        })
    })

    it('sends ONE email however many people were added', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: {
                ...EDIT_FORM,
                newMembers: [STAGED_MEMBER, { ...STAGED_MEMBER, name: 'Dana Patterson' }],
            },
        })

        await actions.save(makeEvent())

        expect(mockAddAdminMember).toHaveBeenCalledTimes(2)
        expect(mockNotify).toHaveBeenCalledOnce()
        const [params] = mockNotify.mock.calls[0]
        expect(params.changeSummary).toHaveLength(2)
    })

    it('audits every addition', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...EDIT_FORM, newMembers: [STAGED_MEMBER] },
        })

        await actions.save(makeEvent())

        expect(mockAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'member_added',
                actor: { id: 'admin-1', role: 'admin' },
            }),
        )
    })

    /* The money guardrails are about money already taken. Adding an offline place at face value owes
       nobody a refund, so it stays allowed on a paid party — unlike a reprice or a removal. */
    it('allows adding to a PAID registration', async () => {
        mockGetRegistrationWithEvent.mockResolvedValue({
            registration: { id: 'reg-1', status: 'paid', eventId: 'evt-1' },
            event: { title: 'Reunion 2027' },
        })
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...EDIT_FORM, status: 'paid', newMembers: [STAGED_MEMBER] },
        })

        const result = await actions.save(makeEvent())

        expect(mockAddAdminMember).toHaveBeenCalledOnce()
        expect(result).toMatchObject({ saved: true })
    })
})

describe('POST /admin/registrations/[id] reissue_link', () => {
    it('builds the manage URL from the request origin and audits the re-issue', async () => {
        await actions.reissue_link(makeEvent())

        const [params] = mockReissueManagementLink.mock.calls[0]
        expect(params.registrationId).toBe('reg-1')
        expect(params.manageUrl('abc')).toBe('http://localhost/register/manage?token=abc')
        expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'link_reissued' }))
    })

    /* A failed send means nothing was rotated, so the old link still works. An admin who believes
       they have re-issued a link and has not is worse off than one who is told. */
    it('reports the failure and says the existing link still works', async () => {
        mockReissueManagementLink.mockRejectedValue(new Error('Resend rejected the email'))

        const result = await actions.reissue_link(makeEvent())

        expect(mockReportError).toHaveBeenCalled()
        expect(result).toMatchObject({ status: 502 })
        expect(JSON.stringify(result)).toContain('existing link still works')
        expect(mockAudit).not.toHaveBeenCalled()
    })
})
