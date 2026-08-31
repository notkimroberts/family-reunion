import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './+server'

const { mockVerify, mockGetRegistrationsByEmail, mockReportError } = vi.hoisted(() => ({
    mockVerify: vi.fn(),
    mockGetRegistrationsByEmail: vi.fn(),
    mockReportError: vi.fn(),
}))

vi.mock('$lib/server/debug', () => ({ dbg: { email: vi.fn() } }))
vi.mock('$lib/server/email', () => ({ verifyWebhookEvent: mockVerify }))
vi.mock('$lib/server/registrations', () => ({
    getRegistrationsByEmail: mockGetRegistrationsByEmail,
}))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

function makeRequest(body = '{}') {
    return {
        request: new Request('http://localhost/api/webhooks/resend', { method: 'POST', body }),
    } as unknown as Parameters<typeof POST>[0]
}

function bouncedEvent(to = ['Alice@Example.com']) {
    return {
        type: 'email.bounced' as const,
        created_at: '2026-08-24T00:00:00Z',
        data: {
            email_id: 'email-1',
            message_id: 'msg-1',
            from: 'noreply@example.com',
            to,
            subject: 'Registration confirmed: Reunion 2027',
            created_at: '2026-08-24T00:00:00Z',
            bounce: { type: 'Permanent', subType: 'NoEmail', message: 'mailbox does not exist' },
        },
    }
}

describe('POST /api/webhooks/resend', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetRegistrationsByEmail.mockResolvedValue([{ id: 'reg-1', eventTitle: 'Reunion 2027' }])
    })

    /* Webhooks are unauthenticated POSTs — anyone who learns the URL can forge one. An
       unverified payload must never reach the handler body. */
    it('rejects an invalid signature without doing any work', async () => {
        mockVerify.mockReturnValue({ ok: false, reason: 'invalid_signature' })

        const res = await POST(makeRequest())

        expect(res.status).toBe(400)
        expect(mockGetRegistrationsByEmail).not.toHaveBeenCalled()
        expect(mockReportError).not.toHaveBeenCalled()
    })

    it('rejects a request with no svix headers', async () => {
        mockVerify.mockReturnValue({ ok: false, reason: 'missing_headers' })

        const res = await POST(makeRequest())

        expect(res.status).toBe(400)
        expect(mockGetRegistrationsByEmail).not.toHaveBeenCalled()
    })

    /* Distinct from a forged request: the endpoint is registered with Resend but the secret is
       missing, so every delivery failure is being silently dropped. That needs an operator. */
    it('reports a missing webhook secret as a deployment fault', async () => {
        mockVerify.mockReturnValue({ ok: false, reason: 'unconfigured' })

        const res = await POST(makeRequest())

        expect(res.status).toBe(500)
        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('RESEND_WEBHOOK_SECRET'),
            expect.any(Error),
        )
    })

    it('reports a bounce with the bounce detail and the affected registration', async () => {
        mockVerify.mockReturnValue({ ok: true, event: bouncedEvent() })

        const res = await POST(makeRequest())

        expect(res.status).toBe(200)
        expect(mockReportError).toHaveBeenCalledWith(
            'resend email.bounced',
            expect.any(Error),
            expect.objectContaining({
                recipient: 'Alice@Example.com',
                emailId: 'email-1',
                detail: 'Permanent/NoEmail: mailbox does not exist',
                registrationIds: 'reg-1',
            }),
        )
    })

    /* The registration schema lowercases contact emails, so a differently-cased recipient would
       silently match nothing and the bounce would look unattributable. */
    it('lowercases the recipient before looking up registrations', async () => {
        mockVerify.mockReturnValue({ ok: true, event: bouncedEvent(['Alice@Example.COM']) })

        await POST(makeRequest())

        expect(mockGetRegistrationsByEmail).toHaveBeenCalledWith('alice@example.com')
    })

    it('still reports when no registration matches the address', async () => {
        mockVerify.mockReturnValue({ ok: true, event: bouncedEvent() })
        mockGetRegistrationsByEmail.mockResolvedValue([])

        await POST(makeRequest())

        expect(mockReportError).toHaveBeenCalledWith(
            'resend email.bounced',
            expect.any(Error),
            expect.objectContaining({ registrationIds: 'none' }),
        )
    })

    it('reports a spam complaint', async () => {
        mockVerify.mockReturnValue({
            ok: true,
            event: { ...bouncedEvent(), type: 'email.complained' },
        })

        await POST(makeRequest())

        expect(mockReportError).toHaveBeenCalledWith(
            'resend email.complained',
            expect.any(Error),
            expect.objectContaining({ recipient: 'Alice@Example.com' }),
        )
    })

    /* Success events are the overwhelming majority of traffic; they must not alert anyone. */
    it.each(['email.sent', 'email.delivered', 'email.opened', 'email.delivery_delayed'])(
        'ignores %s',
        async (type) => {
            mockVerify.mockReturnValue({ ok: true, event: { ...bouncedEvent(), type } })

            const res = await POST(makeRequest())

            expect(res.status).toBe(200)
            expect(mockReportError).not.toHaveBeenCalled()
            expect(mockGetRegistrationsByEmail).not.toHaveBeenCalled()
        },
    )
})
