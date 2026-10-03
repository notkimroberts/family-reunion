import { beforeEach, describe, expect, it, vi } from 'vitest'

/* What the payer and the organisers see on Stripe's side. Nothing else asserts on the session
   payload: every caller's suite mocks this module whole. */

const mockCreate = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ checkout: { sessions: { create: mockCreate } } }),
}))

const { createRegistrationCheckout } = await import('./createRegistrationCheckout')

const PARAMS = {
    lineItems: [{ name: 'Alice Patterson (Adult)', priceCents: 17030 }],
    registrationId: 'reg-1',
    managementToken: 'plaintext-token',
    donationId: 'don-1',
    description: 'Reunion 2027 registration',
    customerEmail: 'alice@example.com',
    successUrl: () => 'https://example.com/register/manage?token=plaintext-token',
    cancelUrl: () => 'https://example.com/register?cancelled=true',
}

describe('createRegistrationCheckout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' })
    })

    it('brands the session: Book button, fee note, statement suffix and a named payment', async () => {
        await createRegistrationCheckout(PARAMS)

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                submit_type: 'book',
                custom_text: {
                    submit: { message: expect.stringContaining('card processing fee') },
                },
                payment_intent_data: {
                    description: 'Reunion 2027 registration',
                    statement_descriptor_suffix: 'REUNION',
                    metadata: { registrationId: 'reg-1', donationId: 'don-1' },
                },
            }),
        )
    })

    it('keeps the management token off the payment, where dashboard users and receipts see it', async () => {
        await createRegistrationCheckout(PARAMS)

        const [session] = mockCreate.mock.calls[0]
        expect(JSON.stringify(session.payment_intent_data)).not.toContain('plaintext-token')
    })

    it('omits donationId from the payment when no gift shares the checkout', async () => {
        await createRegistrationCheckout({ ...PARAMS, donationId: undefined })

        const [session] = mockCreate.mock.calls[0]
        expect(session.payment_intent_data.metadata).toEqual({ registrationId: 'reg-1' })
    })
})
