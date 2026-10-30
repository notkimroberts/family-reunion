import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRetrieve = vi.fn()
const mockExpire = vi.fn()
vi.mock('$lib/server/stripe', () => ({
    getStripe: () => ({ checkout: { sessions: { retrieve: mockRetrieve, expire: mockExpire } } }),
}))

const { expireCheckoutSession } = await import('./expireCheckoutSession')

describe('expireCheckoutSession', () => {
    beforeEach(() => vi.clearAllMocks())

    it('expires an open session', async () => {
        mockRetrieve.mockResolvedValue({ status: 'open' })

        expect(await expireCheckoutSession('cs_1')).toBe('expired')
        expect(mockExpire).toHaveBeenCalledWith('cs_1')
    })

    it('leaves a paid session alone and says so', async () => {
        mockRetrieve.mockResolvedValue({ status: 'complete' })

        expect(await expireCheckoutSession('cs_1')).toBe('complete')
        expect(mockExpire).not.toHaveBeenCalled()
    })

    /* Stripe refuses to expire a session that is no longer open. */
    it('does not call expire on a session that has already expired', async () => {
        mockRetrieve.mockResolvedValue({ status: 'expired' })

        expect(await expireCheckoutSession('cs_1')).toBe('expired')
        expect(mockExpire).not.toHaveBeenCalled()
    })

    /* Paid between the retrieve and the expire: the caller must see a failure, not 'expired'. */
    it('throws when Stripe refuses the expire', async () => {
        mockRetrieve.mockResolvedValue({ status: 'open' })
        mockExpire.mockRejectedValue(new Error('session is not open'))

        await expect(expireCheckoutSession('cs_1')).rejects.toThrow('session is not open')
    })
})
