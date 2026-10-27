import { beforeEach, describe, expect, it, vi } from 'vitest'

/* What a card payment for owed places sends to Stripe, and how a second press of Pay is kept from
   opening a second payable session. */

const mockCreate = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ checkout: { sessions: { create: mockCreate } } }),
}))

const { createMemberPaymentCheckout } = await import('./createMemberPaymentCheckout')

const PARAMS = {
    registrationId: 'reg-1',
    viewToken: 'plaintext-token',
    lines: [{ memberId: 'm2', name: 'Jada Patterson (Child)', grossCents: 10330 }],
    description: 'Reunion 2027 registration',
    customerEmail: 'alice@example.com',
    successUrl: 'https://example.com/register/pay?confirming',
    cancelUrl: 'https://example.com/register/pay',
}

describe('createMemberPaymentCheckout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' })
    })

    it('charges each owed place at its gross and names the payment as a registration', async () => {
        const result = await createMemberPaymentCheckout(PARAMS)

        expect(result).toEqual({ url: 'https://checkout.stripe.com/cs_1', sessionId: 'cs_1' })
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: { name: 'Jada Patterson (Child)' },
                            unit_amount: 10330,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: expect.objectContaining({
                    description: 'Reunion 2027 registration',
                    statement_descriptor_suffix: 'REUNION',
                }),
                metadata: {
                    type: 'member_payment',
                    registrationId: 'reg-1',
                    viewToken: 'plaintext-token',
                    memberCharges: 'm2:10330',
                },
            }),
            expect.anything(),
        )
    })

    it('keeps the view token off the payment, where dashboard users and receipts see it', async () => {
        await createMemberPaymentCheckout(PARAMS)

        const [session] = mockCreate.mock.calls[0]
        expect(JSON.stringify(session.payment_intent_data)).not.toContain('plaintext-token')
    })

    /* Stripe returns the original session for a repeated key, so a double press cannot open two
       sessions that could both be paid. */
    it('sends the same idempotency key for the same request', async () => {
        await createMemberPaymentCheckout(PARAMS)
        await createMemberPaymentCheckout(PARAMS)

        const [[, first], [, second]] = mockCreate.mock.calls
        expect(first.idempotencyKey).toMatch(/^member-payment-reg-1-[0-9a-f]{16}$/)
        expect(second.idempotencyKey).toBe(first.idempotencyKey)
    })

    /* Reusing a key with different parameters is an error at Stripe, and a changed amount needs a new
       session anyway. */
    it('sends a different key once what is owed changes', async () => {
        await createMemberPaymentCheckout(PARAMS)
        await createMemberPaymentCheckout({
            ...PARAMS,
            lines: [{ ...PARAMS.lines[0], grossCents: 16509 }],
        })

        const [[, first], [, second]] = mockCreate.mock.calls
        expect(second.idempotencyKey).not.toBe(first.idempotencyKey)
    })
})
