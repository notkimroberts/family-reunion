import { isHttpError } from '@sveltejs/kit'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './+server'

const { mockRequireAuth } = vi.hoisted(() => ({
    mockRequireAuth: vi.fn().mockReturnValue({ id: 'user-1' }),
}))

const { mockGetRegistrationStatus } = vi.hoisted(() => ({
    mockGetRegistrationStatus: vi.fn().mockResolvedValue(null),
}))

vi.mock('$lib/server/auth/guards', () => ({ requireAuth: mockRequireAuth }))
vi.mock('$lib/server/registrations', () => ({
    getRegistrationStatus: mockGetRegistrationStatus,
}))

function makeEvent(registrationId: string): Parameters<typeof GET>[0] {
    return {
        locals: {},
        params: { id: registrationId },
    } as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/registration/[id]/status', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAuth.mockReturnValue({ id: 'user-1' })
        mockGetRegistrationStatus.mockResolvedValue(null)
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
        mockGetRegistrationStatus.mockResolvedValueOnce('paid')
        const res = await GET(makeEvent('reg-123'))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.status).toBe('paid')
    })

    it('returns pending status', async () => {
        mockGetRegistrationStatus.mockResolvedValueOnce('pending')
        const res = await GET(makeEvent('reg-123'))
        const body = await res.json()
        expect(body.status).toBe('pending')
    })

    it('throws 404 when registration is not found', async () => {
        mockGetRegistrationStatus.mockResolvedValueOnce(null)
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
        mockGetRegistrationStatus.mockResolvedValueOnce(null)
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
