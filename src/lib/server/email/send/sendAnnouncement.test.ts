import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Batching and the idempotency keys an announcement's retry depends on. The SDK is mocked; the
   assertions are on what is handed to it. */

const mockBatchSend = vi.fn()

vi.mock('resend', () => ({
    Resend: class {
        batch = { send: mockBatchSend }
    },
}))

const { sendAnnouncement } = await import('./sendAnnouncement')

const DATA = {
    eventTitle: 'Patterson Family Reunion 2027',
    subject: 'Hotel rooms',
    body: 'Book by June 1.',
    siteOrigin: 'https://example.com',
}

const addresses = (count: number) => Array.from({ length: count }, (_, i) => `f${i}@example.com`)

beforeEach(() => {
    vi.clearAllMocks()
    mockBatchSend.mockResolvedValue({ data: { data: [] }, error: null })
})

describe('sendAnnouncement', () => {
    it('splits 250 recipients into batches of 100, 100 and 50 with stable keys', async () => {
        const progress: number[] = []
        await sendAnnouncement({
            announcementId: 'a1',
            recipients: addresses(250),
            data: DATA,
            alreadySent: 0,
            onProgress: async (count) => {
                progress.push(count)
            },
        })

        expect(mockBatchSend.mock.calls.map(([batch]) => batch.length)).toEqual([100, 100, 50])
        expect(mockBatchSend.mock.calls.map(([, options]) => options.idempotencyKey)).toEqual([
            'announcement/a1/0',
            'announcement/a1/1',
            'announcement/a1/2',
        ])
        expect(progress).toEqual([100, 200, 250])
        expect(mockBatchSend.mock.calls[0][0][0]).toMatchObject({
            to: 'f0@example.com',
            subject: 'Hotel rooms',
        })
    })

    it('resumes after the batches already sent', async () => {
        await sendAnnouncement({
            announcementId: 'a1',
            recipients: addresses(250),
            data: DATA,
            alreadySent: 200,
            onProgress: async () => {},
        })
        expect(mockBatchSend.mock.calls.map(([, options]) => options.idempotencyKey)).toEqual([
            'announcement/a1/2',
        ])
    })

    it('throws when Resend rejects a batch, having reported progress up to it', async () => {
        mockBatchSend
            .mockResolvedValueOnce({ data: { data: [] }, error: null })
            .mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } })
        const progress: number[] = []

        await expect(
            sendAnnouncement({
                announcementId: 'a1',
                recipients: addresses(150),
                data: DATA,
                alreadySent: 0,
                onProgress: async (count) => {
                    progress.push(count)
                },
            }),
        ).rejects.toThrow('rate limited')
        expect(progress).toEqual([100])
    })
})
