import { stringify } from 'devalue'
import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { hashManagementToken } from '$lib/server/registrations/hashManagementToken'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* Recovering a lost management link.

   Resend is mocked at the SDK, but nothing between the action and it is: the real
   action → deliverManagementLink → sendRecoveryEmail → send() chain runs, because the link that was
   actually broken is send() swallowing Resend's `{ error }`.

   The database is real, so "did not rotate" is now the stored hash still matching the token the
   registrant is holding — the thing that decides whether they can get back into a paid booking.
   The old version asserted a `rotateManagementToken` mock went uncalled, which is a statement about
   the code's shape rather than about their access. */

const { mockEmailSend, MockResend, mockEnv } = vi.hoisted(() => {
    const mockEnv = { RESEND_API_KEY: 're_test_key' }
    const mockEmailSend = vi.fn()
    function MockResendConstructor() {
        return { emails: { send: mockEmailSend } }
    }
    return { mockEmailSend, MockResend: vi.fn(MockResendConstructor), mockEnv }
})
const mockReportError = vi.fn()

vi.mock('resend', () => ({ Resend: MockResend }))
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))

const { actions } = await import('./+page.server')

const RESEND_OK = { data: { id: 'email-1' }, error: null }
const RESEND_FAILED = {
    data: null,
    error: { name: 'validation_error', message: 'The example.com domain is not verified' },
}

let db: Awaited<ReturnType<typeof resetTestDb>>

function recover(email = 'alice@example.com') {
    const formData = new FormData()
    formData.append('__superform_json', stringify({ email }))
    return actions.default({
        request: new Request('http://localhost/register/recover', {
            method: 'POST',
            body: formData,
        }),
        url: new URL('http://localhost/register/recover'),
    } as unknown as Parameters<typeof actions.default>[0])
}

async function storedHash(registrationId: string) {
    const [row] = await db
        .select({ managementToken: registrations.managementToken })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row.managementToken
}

describe('POST /register/recover', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockEnv.RESEND_API_KEY = 're_test_key'
        mockEmailSend.mockResolvedValue(RESEND_OK)
        db = await resetTestDb()
    })

    it('emails a working link and rotates to it once the send is confirmed', async () => {
        const seeded = await seedRegistration(db, { contactEmail: 'alice@example.com' })

        const result = await recover()

        const [payload] = mockEmailSend.mock.calls[0]
        expect(payload.to).toBe('alice@example.com')
        const sentToken = payload.text.match(/token=([\w-]+)/)?.[1]
        /* The link in the email is the one that now opens the booking. */
        expect(await storedHash(seeded.registrationId)).toBe(hashManagementToken(sentToken))
        expect(result).toMatchObject({ sent: true })
    })

    /* The regression this file exists for. The DB stores only the token hash, so rotating before a
       confirmed delivery is unrecoverable: the registrant's old link no longer hashes to anything
       and the new one never arrived. Resend resolves with { error } rather than rejecting, so this
       only holds while send() inspects it. */
    it('does NOT rotate the token when Resend reports a failure', async () => {
        const seeded = await seedRegistration(db, { contactEmail: 'alice@example.com' })
        mockEmailSend.mockResolvedValue(RESEND_FAILED)

        const result = await recover()

        expect(mockEmailSend).toHaveBeenCalledOnce()
        /* The link they are already holding still works. */
        expect(await storedHash(seeded.registrationId)).toBe(
            hashManagementToken(seeded.managementToken),
        )
        /* Still a generic success, to avoid leaking which addresses are registered. */
        expect(result).toMatchObject({ sent: true })
        /* The registrant asked for a link and silently got nothing, and the generic response hides
           that from them — so it has to reach an operator. dbg alone does not: the debug package is
           never enabled under `node build/index.js`. */
        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('not rotated'),
            expect.anything(),
            { registrationId: seeded.registrationId },
        )
    })

    it('does NOT rotate the token when RESEND_API_KEY is missing in production', async () => {
        const seeded = await seedRegistration(db, { contactEmail: 'alice@example.com' })
        mockEnv.RESEND_API_KEY = ''

        await recover()

        expect(await storedHash(seeded.registrationId)).toBe(
            hashManagementToken(seeded.managementToken),
        )
    })

    /* One address can own several years' bookings. A failure on one must not cost them the other. */
    it('rotates only the registrations whose email actually sent', async () => {
        const current = await seedEvent(db, { year: 2027 })
        const past = await seedEvent(db, { year: 2026, status: 'closed' })
        const a = await seedRegistration(db, {
            eventId: current,
            contactEmail: 'alice@example.com',
        })
        const b = await seedRegistration(db, { eventId: past, contactEmail: 'alice@example.com' })
        mockEmailSend.mockResolvedValueOnce(RESEND_FAILED).mockResolvedValueOnce(RESEND_OK)

        await recover()

        expect(mockEmailSend).toHaveBeenCalledTimes(2)
        const stored = await Promise.all([
            storedHash(a.registrationId),
            storedHash(b.registrationId),
        ])
        const original = [
            hashManagementToken(a.managementToken),
            hashManagementToken(b.managementToken),
        ]
        /* Exactly one rotated: the booking whose email failed keeps the link its owner still has. */
        expect(stored.filter((hash, index) => hash === original[index])).toHaveLength(1)
    })

    /* Email enumeration: an unknown address must be indistinguishable from a known one. */
    it('reports generic success when no registration matches the email', async () => {
        await seedRegistration(db, { contactEmail: 'someone@example.com' })

        const result = await recover('nobody@example.com')

        expect(mockEmailSend).not.toHaveBeenCalled()
        expect(result).toMatchObject({ sent: true })
    })

    it('rejects a malformed address without sending anything', async () => {
        const result = await recover('not-an-email')

        expect(result).toMatchObject({ status: 400 })
        expect(mockEmailSend).not.toHaveBeenCalled()
    })
})
