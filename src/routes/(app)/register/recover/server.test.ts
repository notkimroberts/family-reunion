import { describe, it, expect, vi, beforeEach } from 'vitest'
import { actions } from './+page.server'

const { mockSuperValidate } = vi.hoisted(() => ({
    mockSuperValidate: vi.fn(),
}))

const { mockRotate } = vi.hoisted(() => ({ mockRotate: vi.fn() }))

const { mockUpdate, mockSet, mockWhere, mockDb } = vi.hoisted(() => {
    const mockUpdate = vi.fn()
    const mockSet = vi.fn()
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const chain = { update: mockUpdate, set: mockSet, where: mockWhere }
    mockUpdate.mockReturnValue(chain)
    mockSet.mockReturnValue(chain)
    return { mockUpdate, mockSet, mockWhere, mockDb: chain }
})

const { mockGetRegistrationsByEmail, mockGenerateToken } = vi.hoisted(() => ({
    mockGetRegistrationsByEmail: vi.fn(),
    mockGenerateToken: vi.fn(),
}))

/* Resend is mocked, but $lib/server/email is NOT: the whole point is to exercise the real
   action → sendRecoveryEmail → send → Resend chain. Mocking sendRecoveryEmail here would
   skip the link that was actually broken (send() swallowing Resend's { error }). */
const { mockEnv, mockEmailSend, MockResend } = vi.hoisted(() => {
    const mockEnv = { RESEND_API_KEY: 're_test_key' }
    const mockEmailSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    function MockResendConstructor() {
        return { emails: { send: mockEmailSend } }
    }
    return { mockEnv, mockEmailSend, MockResend: vi.fn(MockResendConstructor) }
})

const { mockReportError } = vi.hoisted(() => ({ mockReportError: vi.fn() }))

vi.mock('sveltekit-superforms/server', () => ({ superValidate: mockSuperValidate }))
vi.mock('sveltekit-superforms/adapters', () => ({ zod4: (s: unknown) => s }))
vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ registrations: { id: 'id' } }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn(), email: vi.fn() } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('$lib/server/registrations', () => ({
    getRegistrationsByEmail: mockGetRegistrationsByEmail,
}))
vi.mock('$lib/server/registrations/hashManagementToken', () => ({
    generateManagementToken: mockGenerateToken,
}))
vi.mock('$lib/server/registrations/rotateManagementToken', () => ({
    rotateManagementToken: mockRotate,
}))
vi.mock('./schema', () => ({ recoverSchema: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('resend', () => ({ Resend: MockResend }))
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }))
vi.mock('$app/environment', () => ({ dev: false }))
vi.mock('$lib/general/constants', () => ({
    APP_NAME: 'Test App',
    APP_DOMAIN: 'example.com',
    CONTACT_EMAIL: 'organiser@example.com',
    CONTACT_PHONE: '+1 555 0100',
}))

function makeEvent() {
    return {
        request: new Request('http://localhost/register/recover', { method: 'POST' }),
        url: new URL('http://localhost/register/recover'),
    } as unknown as Parameters<typeof actions.default>[0]
}

const RESEND_OK = { data: { id: 'email-1' }, error: null }
const RESEND_FAILED = {
    data: null,
    error: { name: 'validation_error', message: 'The example.com domain is not verified' },
}

const oneMatch = [{ id: 'reg-1', eventTitle: 'Family Reunion 2027' }]

describe('POST /register/recover', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSuperValidate.mockResolvedValue({ valid: true, data: { email: 'alice@example.com' } })
        mockGetRegistrationsByEmail.mockResolvedValue(oneMatch)
        mockGenerateToken.mockReturnValue({ plaintext: 'new-plain', hash: 'new-hash' })
        mockEmailSend.mockReset()
        mockEmailSend.mockResolvedValue(RESEND_OK)
        mockUpdate.mockReturnValue(mockDb)
        mockSet.mockReturnValue(mockDb)
        mockWhere.mockResolvedValue(undefined)
        mockRotate.mockReset()
        mockRotate.mockResolvedValue(undefined)
    })

    it('rotates the token after a successful send', async () => {
        const result = await actions.default(makeEvent())

        const [payload] = mockEmailSend.mock.calls[0]
        expect(payload.to).toBe('alice@example.com')
        expect(payload.text).toContain('http://localhost/register/manage?token=new-plain')
        expect(mockRotate).toHaveBeenCalledWith({ registrationId: 'reg-1', newHash: 'new-hash' })
        expect(result).toMatchObject({ sent: true })
    })

    /* The regression this file exists for. The DB stores only the token hash, so rotating
       before a confirmed delivery is unrecoverable: the registrant's old link no longer
       hashes to anything and the new one never arrived. Resend resolves with { error }
       rather than rejecting, so this only holds while send() inspects it. */
    it('does NOT rotate the token when Resend reports a failure', async () => {
        mockEmailSend.mockResolvedValue(RESEND_FAILED)

        const result = await actions.default(makeEvent())

        expect(mockEmailSend).toHaveBeenCalledOnce()
        expect(mockRotate).not.toHaveBeenCalled()
        /* Still a generic success, to avoid leaking which addresses are registered. */
        expect(result).toMatchObject({ sent: true })
        /* The registrant asked for a link and silently got nothing, and the generic response
           hides that from them — so it has to reach an operator. dbg alone does not: the debug
           package is never enabled under `node build/index.js`. */
        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('not rotated'),
            expect.any(Error),
            { registrationId: 'reg-1' },
        )
    })

    it('does NOT rotate the token when RESEND_API_KEY is missing in production', async () => {
        mockEnv.RESEND_API_KEY = ''
        try {
            await actions.default(makeEvent())
            expect(mockRotate).not.toHaveBeenCalled()
        } finally {
            mockEnv.RESEND_API_KEY = 're_test_key'
        }
    })

    it('rotates only the registrations whose email actually sent', async () => {
        mockGetRegistrationsByEmail.mockResolvedValue([
            { id: 'reg-1', eventTitle: 'Reunion 2026' },
            { id: 'reg-2', eventTitle: 'Reunion 2027' },
        ])
        mockEmailSend.mockResolvedValueOnce(RESEND_FAILED).mockResolvedValueOnce(RESEND_OK)

        await actions.default(makeEvent())

        expect(mockEmailSend).toHaveBeenCalledTimes(2)
        expect(mockRotate).toHaveBeenCalledTimes(1)
    })

    it('reports generic success when no registration matches the email', async () => {
        mockGetRegistrationsByEmail.mockResolvedValue([])

        const result = await actions.default(makeEvent())

        expect(mockEmailSend).not.toHaveBeenCalled()
        expect(mockRotate).not.toHaveBeenCalled()
        expect(result).toMatchObject({ sent: true })
    })
})
