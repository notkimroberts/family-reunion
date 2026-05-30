import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './+server'

const { mockConstructEvent } = vi.hoisted(() => ({
    mockConstructEvent: vi.fn(),
}))

const { mockWhere, mockSet, mockDb } = vi.hoisted(() => {
    const mockWhere = vi.fn().mockResolvedValue([])
    const mockSet = vi.fn()
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: mockWhere,
        update: vi.fn(),
        set: mockSet,
        transaction: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.from.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    mockSet.mockReturnValue(chain)
    chain.transaction.mockImplementation(async (cb: (tx: typeof chain) => Promise<void>) =>
        cb(chain),
    )
    return { mockWhere, mockSet, mockDb: chain }
})

const { mockSendEmail } = vi.hoisted(() => ({
    mockSendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('$env/dynamic/private', () => ({
    env: { STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test_mock' },
}))

// Must use a regular function (not arrow) so new Stripe(...) works
vi.mock('stripe', () => {
    function MockStripe() {
        return { webhooks: { constructEvent: mockConstructEvent } }
    }
    MockStripe.createFetchHttpClient = () => ({})
    return { default: MockStripe }
})

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    registrations: {},
    reunionEvents: {},
    partyMembers: {},
}))
vi.mock('$lib/server/debug', () => ({ dbg: { stripe: vi.fn() } }))
vi.mock('$lib/server/email', () => ({ sendRegistrationConfirmation: mockSendEmail }))
vi.mock('$lib/utils/age', () => ({ getAge: vi.fn().mockReturnValue(30), parseBirthDate: vi.fn() }))

const mockRegistration = {
    id: 'reg-123',
    eventId: 'event-456',
    totalAmountCents: 5000,
    status: 'paid',
}
const mockReunionEvent = { id: 'event-456', title: 'Family Reunion 2026' }
const mockMember = {
    id: 'member-1',
    name: 'Alice',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    shirtSize: 'M',
    registrationId: 'reg-123',
}
const validSession = {
    metadata: { registrationId: 'reg-123' },
    customer_details: { email: 'alice@example.com', name: 'Alice Smith' },
    customer_email: null,
}

function makeRequest(body: string, signature?: string): Parameters<typeof POST>[0] {
    const headers: Record<string, string> = {}
    if (signature !== undefined) {
        headers['stripe-signature'] = signature
    }
    return {
        request: new Request('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body,
            headers,
        }),
    } as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/webhooks/stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSendEmail.mockResolvedValue(undefined)
        mockWhere.mockResolvedValue([])
        mockSet.mockReturnValue(mockDb)
    })

    it('returns 400 when stripe-signature header is missing', async () => {
        const res = await POST(makeRequest('{}'))
        expect(res.status).toBe(400)
    })

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature')
        })
        const res = await POST(makeRequest('{}', 'bad-sig'))
        expect(res.status).toBe(400)
    })

    it('returns 200 for unhandled event types without touching DB', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'payment_intent.created',
            data: { object: {} },
        })
        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockWhere).not.toHaveBeenCalled()
    })

    it('returns 200 for checkout.session.completed with no registrationId', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { metadata: {} } },
        })
        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockWhere).not.toHaveBeenCalled()
    })

    it('marks registration as paid on checkout.session.completed', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockWhere
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([mockReunionEvent])
            .mockResolvedValueOnce([mockMember])

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
    })

    it('sends confirmation email to customer_details.email when customer_email is null', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockWhere
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([mockReunionEvent])
            .mockResolvedValueOnce([mockMember])

        await POST(makeRequest('{}', 'sig'))
        expect(mockSendEmail).toHaveBeenCalledWith(
            'alice@example.com',
            expect.objectContaining({ eventTitle: 'Family Reunion 2026' }),
        )
    })

    it('falls back to customer_email when customer_details.email is absent', async () => {
        const session = {
            ...validSession,
            customer_email: 'fallback@example.com',
            customer_details: { ...validSession.customer_details, email: null },
        }
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: session },
        })
        mockWhere
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([mockReunionEvent])
            .mockResolvedValueOnce([mockMember])

        await POST(makeRequest('{}', 'sig'))
        expect(mockSendEmail).toHaveBeenCalledWith('fallback@example.com', expect.any(Object))
    })

    it('returns 200 even when email sending throws', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockWhere
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([mockReunionEvent])
            .mockResolvedValueOnce([mockMember])
        mockSendEmail.mockRejectedValue(new Error('Resend unavailable'))

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
    })

    it('skips email when reunionEvent is not found', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockWhere
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([]) // event not found
            .mockResolvedValueOnce([mockMember])

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
    })
})
