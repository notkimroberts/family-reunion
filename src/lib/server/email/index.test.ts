import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRegistrationConfirmation, sendContactEmail, sendRecoveryEmail } from './index'

const { mockEnv } = vi.hoisted(() => ({
    mockEnv: { RESEND_API_KEY: undefined as string | undefined, ADMIN_EMAIL: 'admin@example.com' },
}))

const { mockEmailSend, MockResend } = vi.hoisted(() => {
    const mockEmailSend = vi.fn().mockResolvedValue({})
    function MockResendConstructor() {
        return { emails: { send: mockEmailSend } }
    }
    const MockResend = vi.fn(MockResendConstructor)
    return { mockEmailSend, MockResend }
})

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }))
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
        mockEmailSend.mockResolvedValue({})
    })

    describe('when RESEND_API_KEY is not set', () => {
        beforeEach(() => {
            mockEnv.RESEND_API_KEY = ''
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

        it('sendContactEmail returns without calling send', async () => {
            await sendContactEmail({ name: 'Alice', email: 'alice@example.com' }, 'Hello!')
            expect(mockEmailSend).not.toHaveBeenCalled()
        })

        it('does not throw when key is missing', async () => {
            await expect(
                sendRegistrationConfirmation('test@example.com', confirmData),
            ).resolves.toBeUndefined()
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
            )
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

        it('sendContactEmail sends to ADMIN_EMAIL', async () => {
            await sendContactEmail({ name: 'Alice', email: 'alice@example.com' }, 'Hello!')
            expect(mockEmailSend).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'admin@example.com' }),
            )
        })
    })
})
