import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdate, mockSet, mockWhere, mockDb } = vi.hoisted(() => {
    const mockUpdate = vi.fn()
    const mockSet = vi.fn()
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const chain = { update: mockUpdate, set: mockSet, where: mockWhere }
    mockUpdate.mockReturnValue(chain)
    mockSet.mockReturnValue(chain)
    return { mockUpdate, mockSet, mockWhere, mockDb: chain }
})

const { mockGetRegistrationWithEvent, mockSendRecoveryEmail, mockGenerateToken } = vi.hoisted(
    () => ({
        mockGetRegistrationWithEvent: vi.fn(),
        mockSendRecoveryEmail: vi.fn(),
        mockGenerateToken: vi.fn(),
    }),
)

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({ registrations: {} }))
vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/email', () => ({ sendRecoveryEmail: mockSendRecoveryEmail }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../hashManagementToken', () => ({ generateManagementToken: mockGenerateToken }))
vi.mock('../queries/getRegistrationWithEvent', () => ({
    getRegistrationWithEvent: mockGetRegistrationWithEvent,
}))

const { reissueManagementLink } = await import('./reissueManagementLink')

describe('reissueManagementLink', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetRegistrationWithEvent.mockResolvedValue({
            registration: { id: 'reg-1', contactEmail: 'alice@example.com' },
            event: { title: 'Patterson Family Reunion 2027' },
        })
        mockGenerateToken.mockReturnValue({ plaintext: 'fresh-plain', hash: 'fresh-hash' })
        mockSendRecoveryEmail.mockResolvedValue(undefined)
        mockUpdate.mockReturnValue(mockDb)
        mockSet.mockReturnValue(mockDb)
        mockWhere.mockResolvedValue(undefined)
    })

    it('emails the fresh link and then persists its hash', async () => {
        await reissueManagementLink({
            registrationId: 'reg-1',
            manageUrl: (token) => `https://example.com/register/manage?token=${token}`,
        })

        expect(mockSendRecoveryEmail).toHaveBeenCalledWith('alice@example.com', {
            eventTitle: 'Patterson Family Reunion 2027',
            manageUrl: 'https://example.com/register/manage?token=fresh-plain',
        })
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({ managementToken: 'fresh-hash' }),
        )
    })

    /* The regression this file exists for. The DB stores only the hash, so rotating before a
       confirmed delivery is unrecoverable: the registrant's old link no longer hashes to anything
       stored and the new one never arrived. Locked out permanently, by an admin trying to help. */
    it('does NOT rotate the token when the email fails', async () => {
        mockSendRecoveryEmail.mockRejectedValue(new Error('Resend rejected the email'))

        await expect(
            reissueManagementLink({
                registrationId: 'reg-1',
                manageUrl: (token) => `https://example.com/m?token=${token}`,
            }),
        ).rejects.toThrow()

        expect(mockSet).not.toHaveBeenCalled()
        expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('404s on a missing registration without sending or rotating', async () => {
        mockGetRegistrationWithEvent.mockResolvedValue(undefined)

        await expect(
            reissueManagementLink({ registrationId: 'nope', manageUrl: (t) => t }),
        ).rejects.toThrow()

        expect(mockSendRecoveryEmail).not.toHaveBeenCalled()
        expect(mockSet).not.toHaveBeenCalled()
    })
})
