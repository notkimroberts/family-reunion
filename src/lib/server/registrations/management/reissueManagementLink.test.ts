import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetRegistrationWithEvent, mockSendRecoveryEmail, mockGenerateToken, mockRotate } =
    vi.hoisted(() => ({
        mockGetRegistrationWithEvent: vi.fn(),
        mockSendRecoveryEmail: vi.fn(),
        mockGenerateToken: vi.fn(),
        mockRotate: vi.fn(),
    }))

vi.mock('$lib/server/debug', () => ({ dbg: { register: vi.fn() } }))
vi.mock('$lib/server/email', () => ({ sendRecoveryEmail: mockSendRecoveryEmail }))
vi.mock('../hashManagementToken', () => ({ generateManagementToken: mockGenerateToken }))
vi.mock('../rotateManagementToken', () => ({ rotateManagementToken: mockRotate }))
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
        mockRotate.mockResolvedValue(undefined)
    })

    it('emails the fresh link and then persists its hash', async () => {
        const callOrder: string[] = []
        mockSendRecoveryEmail.mockImplementation(async () => {
            callOrder.push('send')
        })
        mockRotate.mockImplementation(async () => {
            callOrder.push('rotate')
        })

        await reissueManagementLink({
            registrationId: 'reg-1',
            manageUrl: (token) => `https://example.com/register/manage?token=${token}`,
        })

        expect(mockSendRecoveryEmail).toHaveBeenCalledWith('alice@example.com', {
            eventTitle: 'Patterson Family Reunion 2027',
            manageUrl: 'https://example.com/register/manage?token=fresh-plain',
        })
        expect(mockRotate).toHaveBeenCalledWith({
            registrationId: 'reg-1',
            newHash: 'fresh-hash',
        })
        /* Asserting the sequence, not just that both happened — the ordering IS the guarantee. */
        expect(callOrder).toEqual(['send', 'rotate'])
    })

    /* The regression this file exists for. The DB stores only the hash, so rotating before a
       confirmed delivery is unrecoverable: the registrant's old link no longer hashes to anything
       stored and the new one never arrived. Locked out permanently, by an admin trying to help.

       The grace period does not soften this. It preserves the token being rotated AWAY from, which
       is only written once the rotation happens at all — so a rotation before a failed send still
       strands the registrant. */
    it('does NOT rotate the token when the email fails', async () => {
        mockSendRecoveryEmail.mockRejectedValue(new Error('Resend rejected the email'))

        await expect(
            reissueManagementLink({
                registrationId: 'reg-1',
                manageUrl: (token) => `https://example.com/m?token=${token}`,
            }),
        ).rejects.toThrow()

        expect(mockRotate).not.toHaveBeenCalled()
    })

    it('404s on a missing registration without sending or rotating', async () => {
        mockGetRegistrationWithEvent.mockResolvedValue(undefined)

        await expect(
            reissueManagementLink({ registrationId: 'nope', manageUrl: (t) => t }),
        ).rejects.toThrow()

        expect(mockSendRecoveryEmail).not.toHaveBeenCalled()
        expect(mockRotate).not.toHaveBeenCalled()
    })
})
