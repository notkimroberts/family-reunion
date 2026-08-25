import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSuperValidate } = vi.hoisted(() => ({ mockSuperValidate: vi.fn() }))

const {
    mockRequireAdmin,
    mockAddAdminMember,
    mockSetRegistrationStatus,
    mockReissueManagementLink,
    mockReportError,
} = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockAddAdminMember: vi.fn(),
    mockSetRegistrationStatus: vi.fn(),
    mockReissueManagementLink: vi.fn(),
    mockReportError: vi.fn(),
}))

vi.mock('sveltekit-superforms/server', () => ({ superValidate: mockSuperValidate }))
vi.mock('sveltekit-superforms/adapters', () => ({ zod4: (s: unknown) => s }))
vi.mock('$lib/server/auth/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('$lib/server/tiers', () => ({ getTiersForEvent: vi.fn() }))
vi.mock('$lib/server/registrations', () => ({
    addAdminMember: mockAddAdminMember,
    setRegistrationStatus: mockSetRegistrationStatus,
    reissueManagementLink: mockReissueManagementLink,
    getRegistrationMembers: vi.fn(),
    getRegistrationWithEvent: vi.fn(),
}))
vi.mock('./schema', () => ({ adminAddMemberSchema: {}, adminSetStatusSchema: {} }))

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

function makeEvent() {
    return {
        request: new Request('http://localhost/admin/registrations/reg-1', { method: 'POST' }),
        url: new URL('http://localhost/admin/registrations/reg-1'),
        params: { id: 'reg-1' },
        locals: { user: { id: 'admin-1', role: 'admin' } },
    } as unknown as Parameters<typeof actions.add_member>[0]
}

describe('POST /admin/registrations/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSuperValidate.mockResolvedValue({ valid: true, data: { ...MEMBER_FORM } })
        mockAddAdminMember.mockResolvedValue({ memberId: 'member-new' })
        mockSetRegistrationStatus.mockResolvedValue(undefined)
        mockReissueManagementLink.mockResolvedValue(undefined)
    })

    describe('add_member', () => {
        it('requires an admin', async () => {
            await actions.add_member(makeEvent())
            expect(mockRequireAdmin).toHaveBeenCalled()
        })

        it('adds the member to the registration in the URL, converting the yes/no answers', async () => {
            await actions.add_member(makeEvent())

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

        it('returns 400 without adding when validation fails', async () => {
            mockSuperValidate.mockResolvedValue({ valid: false, data: {} })
            const result = await actions.add_member(makeEvent())
            expect(mockAddAdminMember).not.toHaveBeenCalled()
            expect(result).toMatchObject({ status: 400 })
        })
    })

    describe('set_status', () => {
        it('requires an admin and passes the chosen status through', async () => {
            mockSuperValidate.mockResolvedValue({ valid: true, data: { status: 'paid' } })

            const result = await actions.set_status(makeEvent())

            expect(mockRequireAdmin).toHaveBeenCalled()
            expect(mockSetRegistrationStatus).toHaveBeenCalledWith({
                registrationId: 'reg-1',
                status: 'paid',
            })
            expect(result).toMatchObject({ statusChanged: true, newStatus: 'paid' })
        })

        it('returns 400 without writing when validation fails', async () => {
            mockSuperValidate.mockResolvedValue({ valid: false, data: {} })
            const result = await actions.set_status(makeEvent())
            expect(mockSetRegistrationStatus).not.toHaveBeenCalled()
            expect(result).toMatchObject({ status: 400 })
        })
    })

    describe('reissue_link', () => {
        it('builds the manage URL from the request origin', async () => {
            await actions.reissue_link(makeEvent())

            const [params] = mockReissueManagementLink.mock.calls[0]
            expect(params.registrationId).toBe('reg-1')
            expect(params.manageUrl('abc')).toBe('http://localhost/register/manage?token=abc')
        })

        /* A failed send means nothing was rotated, so the old link still works. An admin who
           believes they have re-issued a link and has not is worse off than one who is told. */
        it('reports the failure and says the existing link still works', async () => {
            mockReissueManagementLink.mockRejectedValue(new Error('Resend rejected the email'))

            const result = await actions.reissue_link(makeEvent())

            expect(mockReportError).toHaveBeenCalled()
            expect(result).toMatchObject({ status: 502 })
            expect(JSON.stringify(result)).toContain('existing link still works')
        })
    })
})
