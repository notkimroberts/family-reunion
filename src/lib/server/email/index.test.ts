import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRegistrationConfirmation, sendRecoveryEmail } from './index'

const { mockEnv, mockAppEnv } = vi.hoisted(() => ({
    mockEnv: { RESEND_API_KEY: undefined as string | undefined, ADMIN_EMAIL: 'admin@example.com' },
    mockAppEnv: { dev: false },
}))

const { mockEmailSend, MockResend } = vi.hoisted(() => {
    /* Resend resolves with { data, error } and never rejects, so the default must model a
       successful response shape rather than a bare {}. */
    const mockEmailSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    function MockResendConstructor() {
        return { emails: { send: mockEmailSend } }
    }
    const MockResend = vi.fn(MockResendConstructor)
    return { mockEmailSend, MockResend }
})

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }))
/* Getter so each read of `dev` inside the module sees the current test's value. */
vi.mock('$app/environment', () => ({
    get dev() {
        return mockAppEnv.dev
    },
}))
vi.mock('resend', () => ({ Resend: MockResend }))
vi.mock('$lib/general/constants', () => ({ APP_NAME: 'Test App', APP_DOMAIN: 'example.com' }))
vi.mock('$lib/server/debug', () => ({ dbg: { email: vi.fn() } }))

const confirmData = {
    name: 'Alice',
    eventTitle: 'Family Reunion 2026',
    partyMembers: ['Alice (Adult)', 'Bob (Child)'],
    totalAmount: '$50.00',
    manageUrl: 'https://example.com/register/manage?token=tok-abc',
}

describe('email module', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockEmailSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
        mockAppEnv.dev = false
    })

    describe('when RESEND_API_KEY is not set in dev', () => {
        beforeEach(() => {
            mockEnv.RESEND_API_KEY = ''
            mockAppEnv.dev = true
        })

        it('sendRegistrationConfirmation returns without instantiating Resend', async () => {
            await sendRegistrationConfirmation('test@example.com', confirmData)
            expect(MockResend).not.toHaveBeenCalled()
            expect(mockEmailSend).not.toHaveBeenCalled()
        })

        it('sendRecoveryEmail returns without calling send', async () => {
            await sendRecoveryEmail('test@example.com', {
                eventTitle: 'Family Reunion 2026',
                manageUrl: 'https://example.com/register/manage?token=tok-abc',
            })
            expect(mockEmailSend).not.toHaveBeenCalled()
        })

        it('does not throw when key is missing', async () => {
            await expect(
                sendRegistrationConfirmation('test@example.com', confirmData),
            ).resolves.toBeUndefined()
        })
    })

    /* A silently skipped email in production is worse than a loud failure: callers such as
       the token rotation in /register/recover commit state only when the send "succeeded". */
    describe('when RESEND_API_KEY is not set in production', () => {
        beforeEach(() => {
            mockEnv.RESEND_API_KEY = ''
            mockAppEnv.dev = false
        })

        it('sendRegistrationConfirmation rejects rather than skipping silently', async () => {
            await expect(
                sendRegistrationConfirmation('test@example.com', confirmData),
            ).rejects.toThrow(/RESEND_API_KEY/)
        })

        it('sendRecoveryEmail rejects rather than skipping silently', async () => {
            await expect(
                sendRecoveryEmail('test@example.com', {
                    eventTitle: 'Family Reunion 2026',
                    manageUrl: 'https://example.com/register/manage?token=tok-abc',
                }),
            ).rejects.toThrow(/RESEND_API_KEY/)
        })
    })

    /* The Resend SDK resolves with { data, error } instead of rejecting. Without an explicit
       error check every API failure — unverified domain, rate limit, bad address — looks
       like a successful send to the caller. */
    describe('when Resend reports an error', () => {
        beforeEach(() => {
            mockEnv.RESEND_API_KEY = 're_test_key'
            mockEmailSend.mockResolvedValue({
                data: null,
                error: {
                    name: 'validation_error',
                    message: 'The example.com domain is not verified',
                },
            })
        })

        it('sendRegistrationConfirmation rejects with the Resend message', async () => {
            await expect(
                sendRegistrationConfirmation('test@example.com', confirmData),
            ).rejects.toThrow(/not verified/)
        })

        it('sendRecoveryEmail rejects with the Resend message', async () => {
            await expect(
                sendRecoveryEmail('test@example.com', {
                    eventTitle: 'Family Reunion 2026',
                    manageUrl: 'https://example.com/register/manage?token=tok-abc',
                }),
            ).rejects.toThrow(/not verified/)
        })
    })

    describe('when RESEND_API_KEY is set', () => {
        beforeEach(() => {
            mockEnv.RESEND_API_KEY = 're_test_key'
        })

        it('sendRegistrationConfirmation sends to the given address', async () => {
            await sendRegistrationConfirmation('test@example.com', confirmData)
            expect(mockEmailSend).toHaveBeenCalledOnce()
            expect(mockEmailSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                    subject: expect.stringContaining('Family Reunion 2026'),
                }),
                undefined,
            )
        })

        it('passes an idempotency key through to Resend when given one', async () => {
            await sendRegistrationConfirmation('test@example.com', confirmData, 'confirm/reg-123')
            expect(mockEmailSend).toHaveBeenCalledWith(expect.any(Object), {
                idempotencyKey: 'confirm/reg-123',
            })
        })

        it('sendRegistrationConfirmation includes party members, total, and manage link', async () => {
            await sendRegistrationConfirmation('test@example.com', confirmData)
            const [payload] = mockEmailSend.mock.calls[0]
            expect(payload.text).toContain('Alice (Adult)')
            expect(payload.text).toContain('Bob (Child)')
            expect(payload.text).toContain('$50.00')
            expect(payload.text).toContain('https://example.com/register/manage?token=tok-abc')
        })

        it('sendRecoveryEmail sends the manage URL to the given address', async () => {
            const manageUrl = 'https://example.com/register/manage?token=tok-xyz'
            await sendRecoveryEmail('test@example.com', {
                eventTitle: 'Family Reunion 2026',
                manageUrl,
            })
            expect(mockEmailSend).toHaveBeenCalledOnce()
            const [payload] = mockEmailSend.mock.calls[0]
            expect(payload.to).toBe('test@example.com')
            expect(payload.text).toContain(manageUrl)
        })
    })
})
