import { describe, it, expect, vi, beforeEach } from 'vitest'

/* /admin is the list of reunion years and nothing else — it has no actions at all since creating a year
   moved to /admin/event/new (whose own server.test.ts carries the guard and validation cases).

   What is left worth pinning is isOwner. Any admin may see the list; only the owner is offered the way
   into creating a year or into a year's settings. Hiding is not the protection — both of those routes
   guard themselves — but the flag has to be right, or the one person who can use the control is the one
   who cannot see it. */

const { mockRequireAdmin, mockIsOwner, mockSummaries } = vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockIsOwner: vi.fn(),
    mockSummaries: vi.fn(),
}))

vi.mock('$env/dynamic/private', () => ({ env: { OWNER_EMAIL: 'kim@example.com' } }))
vi.mock('$lib/server/auth/guards', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('$lib/server/auth/isOwner', () => ({ isOwner: mockIsOwner }))
vi.mock('$lib/server/registrations', () => ({ getEventSummaries: mockSummaries }))

const { load } = await import('./+page.server')

function loadEvent() {
    return {
        request: new Request('http://localhost/admin'),
        url: new URL('http://localhost/admin'),
        locals: { user: { id: 'u1', name: 'Kim', email: 'kim@example.com', role: 'admin' } },
    } as unknown as Parameters<typeof load>[0]
}

describe('/admin load', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequireAdmin.mockReturnValue({ id: 'u1', name: 'Kim', email: 'kim@example.com' })
        mockSummaries.mockResolvedValue([])
    })

    /* SvelteKit types a load's return as possibly void, so the assertions read through a narrowed
       local rather than casting the result. */
    async function loadResult() {
        const result = await load(loadEvent())
        if (!result) {
            throw new Error('load returned nothing')
        }
        return result
    }

    it('reports whether the viewer is the owner', async () => {
        mockIsOwner.mockReturnValue(true)

        const result = await loadResult()

        expect(mockRequireAdmin).toHaveBeenCalled()
        expect(result.isOwner).toBe(true)
    })

    it('loads the list for a non-owner admin too', async () => {
        mockIsOwner.mockReturnValue(false)

        const result = await loadResult()

        expect(result.isOwner).toBe(false)
        expect(result.events).toEqual([])
    })
})
