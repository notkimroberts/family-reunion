import { describe, it, expect, vi, beforeEach } from 'vitest'
import { actions } from './+page.server'

const { mockSuperValidate } = vi.hoisted(() => ({ mockSuperValidate: vi.fn() }))

const {
    mockRequireAdmin,
    mockCreateAdminRegistration,
    mockGetConfirmationEmailData,
    mockSendConfirmation,
} = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockCreateAdminRegistration: vi.fn(),
    mockGetConfirmationEmailData: vi.fn(),
    mockSendConfirmation: vi.fn(),
}))

vi.mock('sveltekit-superforms/server', () => ({ superValidate: mockSuperValidate }))
vi.mock('sveltekit-superforms', () => ({ defaults: vi.fn() }))
vi.mock('sveltekit-superforms/adapters', () => ({ zod4: (s: unknown) => s }))
vi.mock('$lib/server/auth/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/email', () => ({ sendRegistrationConfirmation: mockSendConfirmation }))
vi.mock('$lib/server/registrations', () => ({
    createAdminRegistration: mockCreateAdminRegistration,
    getConfirmationEmailData: mockGetConfirmationEmailData,
    getOpenEvent: vi.fn(),
}))
vi.mock('$lib/server/tiers', () => ({ getTiersForEvent: vi.fn() }))
vi.mock('../../register/schema', () => ({ adminRegistrationSchema: {} }))

const validFormData = {
    eventId: 'event-1',
    contactName: 'Alice Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: '',
    status: 'paid',
    selfTierId: 'tier-adult',
    selfBirthDate: '1980-05-05',
    selfShirtSize: 'L',
    selfAddressLine1: '1 Main St',
    selfAddressLine2: '',
    selfAddressCity: 'Shreveport',
    selfAddressState: 'LA',
    selfAddressZip: '71101',
    selfVegetarianMeal: 'no',
    selfAttendedReunion2025: 'yes',
    members: '[]',
}

function makeEvent() {
    return {
        request: new Request('http://localhost/admin/registrations', { method: 'POST' }),
        url: new URL('http://localhost/admin/registrations'),
        locals: { user: { id: 'admin-1', role: 'admin' } },
    } as unknown as Parameters<typeof actions.default>[0]
}

describe('POST /admin/registrations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSuperValidate.mockResolvedValue({ valid: true, data: { ...validFormData } })
        mockCreateAdminRegistration.mockResolvedValue({
            registrationId: 'reg-9',
            managementToken: 'plain-tok',
        })
        mockGetConfirmationEmailData.mockResolvedValue({
            to: 'alice@example.com',
            data: { status: 'paid' },
        })
        mockSendConfirmation.mockResolvedValue(undefined)
    })

    it('requires an admin', async () => {
        await actions.default(makeEvent())
        expect(mockRequireAdmin).toHaveBeenCalled()
    })

    it('returns 400 without creating anything when validation fails', async () => {
        mockSuperValidate.mockResolvedValue({ valid: false, data: {} })
        const result = await actions.default(makeEvent())
        expect(mockCreateAdminRegistration).not.toHaveBeenCalled()
        expect(result).toMatchObject({ status: 400 })
    })

    it('puts the contact first in the party, then the additional members', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: {
                ...validFormData,
                members: JSON.stringify([
                    { name: 'Marcus', tierId: 'tier-adult', vegetarianMeal: 'yes' },
                ]),
            },
        })

        await actions.default(makeEvent())

        const [params] = mockCreateAdminRegistration.mock.calls[0]
        expect(params.members[0]).toMatchObject({
            name: 'Alice Patterson',
            tierId: 'tier-adult',
            vegetarianMeal: false,
            attendedReunion2025: true,
        })
        expect(params.members[1]).toMatchObject({ name: 'Marcus', vegetarianMeal: true })
    })

    it('passes the chosen status straight through', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...validFormData, status: 'waived' },
        })
        await actions.default(makeEvent())
        expect(mockCreateAdminRegistration).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'waived' }),
        )
    })

    it('emails the confirmation and returns the management link', async () => {
        const result = await actions.default(makeEvent())

        expect(mockSendConfirmation).toHaveBeenCalledWith(
            'alice@example.com',
            { status: 'paid' },
            'confirm/reg-9',
        )
        expect(result).toMatchObject({
            success: true,
            registrationId: 'reg-9',
            manageUrl: 'http://localhost/register/manage?token=plain-tok',
            emailSent: true,
        })
    })

    /* The plaintext token exists only in this response — the DB holds its hash — so losing the
       registration because the mail server was down would be the worse failure. The admin can
       read the link out instead. */
    it('keeps the registration and still returns the link when the email fails', async () => {
        mockSendConfirmation.mockRejectedValue(new Error('Resend rejected the email'))

        const result = await actions.default(makeEvent())

        expect(mockCreateAdminRegistration).toHaveBeenCalled()
        expect(result).toMatchObject({
            success: true,
            registrationId: 'reg-9',
            manageUrl: 'http://localhost/register/manage?token=plain-tok',
            emailSent: false,
            emailError: 'Resend rejected the email',
        })
    })

    it('reports an email problem when the confirmation data cannot be assembled', async () => {
        mockGetConfirmationEmailData.mockResolvedValue(undefined)

        const result = await actions.default(makeEvent())

        expect(mockSendConfirmation).not.toHaveBeenCalled()
        expect(result).toMatchObject({ success: true, emailSent: false })
    })

    it('fails the request on malformed member JSON', async () => {
        mockSuperValidate.mockResolvedValue({
            valid: true,
            data: { ...validFormData, members: 'not json' },
        })

        const result = await actions.default(makeEvent())

        expect(mockCreateAdminRegistration).not.toHaveBeenCalled()
        expect(result).toMatchObject({ status: 400 })
    })
})
