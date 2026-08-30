import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The fee lookup runs inside the Stripe webhook, where the payment is already captured and the
   registration must be marked paid regardless. So every failure mode has to come back as `undefined`
   rather than throwing — an exception here would fail the webhook and make Stripe retry an event whose
   real work is done.

   The three links in the expand chain are each typed `string | object | null` by Stripe, because it
   returns a bare id unless the expand resolves. Each of those is a separate way to get nothing. */

const mockRetrieve = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ paymentIntents: { retrieve: mockRetrieve } }),
}))

const { retrievePaymentFee } = await import('./retrievePaymentFee')

describe('retrievePaymentFee', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns the fee from the expanded balance transaction', async () => {
        mockRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: 509, net: 16000 } },
        })

        expect(await retrievePaymentFee('pi_1')).toBe(509)
    })

    it('asks Stripe to expand the whole chain in one call', async () => {
        mockRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: 509 } },
        })

        await retrievePaymentFee('pi_1')

        expect(mockRetrieve).toHaveBeenCalledWith('pi_1', {
            expand: ['latest_charge.balance_transaction'],
        })
    })

    /* `fee`, not amount minus net: they agree on a plain charge but diverge on a partial capture, and
       `fee` is what the Stripe dashboard labels "Fee" — the number being reconciled against. */
    it('reads fee rather than deriving it from net', async () => {
        mockRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: 509, amount: 16509, net: 1 } },
        })

        expect(await retrievePaymentFee('pi_1')).toBe(509)
    })

    it.each([
        ['no charge yet', { latest_charge: null }],
        ['an unexpanded charge id', { latest_charge: 'ch_1' }],
        ['no balance transaction', { latest_charge: { balance_transaction: null } }],
        [
            'an unexpanded balance transaction id',
            { latest_charge: { balance_transaction: 'txn_1' } },
        ],
    ])('returns undefined for %s', async (_label, intent) => {
        mockRetrieve.mockResolvedValue(intent)

        expect(await retrievePaymentFee('pi_1')).toBeUndefined()
    })

    /* The one that matters most: a Stripe outage must not take the webhook down with it. */
    it('returns undefined instead of throwing when Stripe errors', async () => {
        mockRetrieve.mockRejectedValue(new Error('stripe is down'))

        await expect(retrievePaymentFee('pi_1')).resolves.toBeUndefined()
    })

    /* A zero fee is a real answer — a fully discounted or zero-amount charge — and must not be
       confused with "not known". */
    it('preserves a zero fee', async () => {
        mockRetrieve.mockResolvedValue({ latest_charge: { balance_transaction: { fee: 0 } } })

        expect(await retrievePaymentFee('pi_1')).toBe(0)
    })
})
