import { isHttpError } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './+server'

const { mockRequireAuth } = vi.hoisted(() => ({
    mockRequireAuth: vi.fn().mockReturnValue({ id: 'user-1' }),
}))

const { mockLimit, mockDb } = vi.hoisted(() => {
    const mockLimit = vi.fn().mockResolvedValue([])
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: mockLimit,
    }
    chain.select.mockReturnValue(chain)
    chain.from.mockReturnValue(chain)
    chain.where.mockReturnValue(chain)
    return { mockLimit, mockDb: chain }
})

vi.mock('$lib/server/auth/guards', () => ({ requireAuth: mockRequireAuth }))
vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ registrations: {} }))

function makeEvent(registrationId: string): RequestEvent {
    return {
        locals: {},
        params: { id: registrationId },
    } as unknown as RequestEvent
}

describe('GET /api/registration/[id]/status', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAuth.mockReturnValue({ id: 'user-1' })
        mockLimit.mockResolvedValue([])
    })

    it('redirects to /login when not authenticated', async () => {
        const { redirect } = await import('@sveltejs/kit')
        mockRequireAuth.mockImplementation(() => {
            throw redirect(302, '/login')
        })
        await expect(GET(makeEvent('reg-123'))).rejects.toMatchObject({
            status: 302,
            location: '/login',
        })
    })

    it('returns status for own registration', async () => {
        mockLimit.mockResolvedValueOnce([{ status: 'paid' }])
        const res = await GET(makeEvent('reg-123'))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.status).toBe('paid')
    })

    it('returns pending status', async () => {
        mockLimit.mockResolvedValueOnce([{ status: 'pending' }])
        const res = await GET(makeEvent('reg-123'))
        const body = await res.json()
        expect(body.status).toBe('pending')
    })

    it('throws 404 when registration is not found', async () => {
        mockLimit.mockResolvedValueOnce([])
        let caught: unknown
        try {
            await GET(makeEvent('nonexistent'))
        } catch (e) {
            caught = e
        }
        expect(isHttpError(caught)).toBe(true)
        expect((caught as { status: number }).status).toBe(404)
    })

    it('throws 404 when registration belongs to another user', async () => {
        mockLimit.mockResolvedValueOnce([])
        let caught: unknown
        try {
            await GET(makeEvent('other-users-reg'))
        } catch (e) {
            caught = e
        }
        expect(isHttpError(caught)).toBe(true)
        expect((caught as { status: number }).status).toBe(404)
    })
})
