import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ checkout: { sessions: { create: mockCreate } } }),
}))

const { createDonationCheckout } = await import('./createDonationCheckout')

describe('createDonationCheckout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' })
    })

    it('brands the session: Donate button, tax note, statement suffix and a named payment', async () => {
        await createDonationCheckout({
            donationId: 'don-1',
            name: 'Gift to Reunion 2027',
            amountCents: 5000,
            customerEmail: 'bob@example.com',
            successUrl: () => 'https://example.com/donate/thanks',
            cancelUrl: () => 'https://example.com/donate?cancelled=true',
        })

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                submit_type: 'donate',
                custom_text: { submit: { message: expect.stringContaining('not tax-deductible') } },
                payment_intent_data: {
                    description: 'Gift to Reunion 2027',
                    statement_descriptor_suffix: 'GIFT',
                    metadata: { donationId: 'don-1' },
                },
            }),
        )
    })
})
