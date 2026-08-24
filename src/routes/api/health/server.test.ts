import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './+server'

const { mockExecute } = vi.hoisted(() => ({ mockExecute: vi.fn() }))

vi.mock('$lib/server/db', () => ({ db: { execute: mockExecute } }))
vi.mock('$lib/server/debug', () => ({ dbg: { hooks: vi.fn() } }))
vi.mock('drizzle-orm', () => ({ sql: (s: unknown) => s }))

function makeEvent(search = '') {
    return {
        url: new URL(`http://localhost/api/health${search}`),
    } as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/health', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useRealTimers()
        mockExecute.mockResolvedValue(undefined)
    })

    /* The whole point of the liveness check: Railway must be able to promote a deployment
       while the sleeping Postgres is still cold. Touching the DB here would make promotion
       depend on a race, and could hold the DB awake if Railway polls the path. */
    it('returns 200 without touching the database', async () => {
        const res = await GET(makeEvent())

        expect(res.status).toBe(200)
        await expect(res.json()).resolves.toEqual({ status: 'ok' })
        expect(mockExecute).not.toHaveBeenCalled()
    })

    it('still returns 200 when the database is completely down', async () => {
        mockExecute.mockRejectedValue(new Error('ECONNREFUSED'))

        const res = await GET(makeEvent())

        expect(res.status).toBe(200)
        expect(mockExecute).not.toHaveBeenCalled()
    })

    describe('?probe=db', () => {
        it('reports ok on the first attempt when the database is awake', async () => {
            const res = await GET(makeEvent('?probe=db'))

            expect(res.status).toBe(200)
            await expect(res.json()).resolves.toMatchObject({ database: 'ok', attempts: 1 })
            expect(mockExecute).toHaveBeenCalledTimes(1)
        })

        /* Reproduces the reported degraded-then-ok: the first connection to a sleeping DB
           fails and triggers the wake. With retry the probe reports the truth (reachable)
           instead of a misleading 'unreachable'.

           Fake timers so the real 1.5s backoff does not slow the suite; advance while the
           handler is mid-await rather than awaiting it first. */
        it('retries past a cold start and reports ok', async () => {
            vi.useFakeTimers()
            mockExecute
                .mockRejectedValueOnce(new Error('connection timeout'))
                .mockResolvedValueOnce(undefined)

            const pending = GET(makeEvent('?probe=db'))
            await vi.advanceTimersByTimeAsync(2000)
            const res = await pending

            expect(res.status).toBe(200)
            await expect(res.json()).resolves.toMatchObject({ database: 'ok', attempts: 2 })
        })

        it('reports 503 unreachable only after exhausting every attempt', async () => {
            vi.useFakeTimers()
            mockExecute.mockRejectedValue(new Error('ECONNREFUSED'))

            const pending = GET(makeEvent('?probe=db'))
            await vi.advanceTimersByTimeAsync(10_000)
            const res = await pending

            expect(res.status).toBe(503)
            await expect(res.json()).resolves.toMatchObject({
                database: 'unreachable',
                attempts: 4,
            })
            expect(mockExecute).toHaveBeenCalledTimes(4)
        })
    })
})
