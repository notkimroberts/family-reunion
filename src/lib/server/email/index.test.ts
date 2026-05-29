import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRegistrationConfirmation, sendMagicLinkEmail, sendContactEmail } from './index'

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

        it('sendMagicLinkEmail returns without calling send', async () => {
            await sendMagicLinkEmail('test@example.com', 'https://example.com/magic-link')
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

        it('sendRegistrationConfirmation includes party members and total in body', async () => {
            await sendRegistrationConfirmation('test@example.com', confirmData)
            const [payload] = mockEmailSend.mock.calls[0]
            expect(payload.text).toContain('Alice (Adult)')
            expect(payload.text).toContain('Bob (Child)')
            expect(payload.text).toContain('$50.00')
        })

        it('sendMagicLinkEmail sends to the given address', async () => {
            await sendMagicLinkEmail('test@example.com', 'https://example.com/magic-link')
            expect(mockEmailSend).toHaveBeenCalledOnce()
            expect(mockEmailSend).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'test@example.com' }),
            )
        })

        it('sendMagicLinkEmail includes the magic link URL in the body', async () => {
            const url = 'https://example.com/magic-link?token=abc123'
            await sendMagicLinkEmail('test@example.com', url)
            const [payload] = mockEmailSend.mock.calls[0]
            expect(payload.text).toContain(url)
        })

        it('sendContactEmail sends to ADMIN_EMAIL', async () => {
            await sendContactEmail({ name: 'Alice', email: 'alice@example.com' }, 'Hello!')
            expect(mockEmailSend).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'admin@example.com' }),
            )
        })
    })
})
