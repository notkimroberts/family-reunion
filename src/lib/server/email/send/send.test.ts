import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_DOMAIN, CONTACT_EMAIL, REUNION_NAME } from '$lib/general/constants'

/* The envelope, which had no test — which is how the From address could sit on `noreply@`
   indefinitely while three templates told the reader to reply to it.

   Two properties, both deliverability rather than correctness, and both invisible in every other
   test because the templates never see the envelope:

   1. The From address must be on APP_DOMAIN and must not say "noreply". Resend flags the literal
      string, and a one-way address discourages the inbox feedback reputation is built on.
   2. Reply-To must be a monitored human address. APP_DOMAIN receives mail only through ImprovMX
      forwarding (see CONTACT_EMAIL), so the header keeps where replies land a deliberate choice
      rather than a side effect of the From address, and "Questions? Reply to this email" true.

   The SDK is mocked because it is genuinely external; the assertion is on the payload handed to it. */

const mockSend = vi.fn()

vi.mock('resend', () => ({
    Resend: class {
        emails = { send: mockSend }
    },
}))

const { send } = await import('./_resend')

function sentPayload() {
    return mockSend.mock.calls[0][0]
}

beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null })
})

async function sendOne() {
    await send({ to: 'alice@example.com', subject: 'Hello', text: 'Body' })
}

describe('send envelope', () => {
    /* DKIM and SPF align on the From domain, so this has to be the domain verified in Resend —
       sending as the committee's gmail.com would fail both. */
    it('sends from the verified domain', async () => {
        await sendOne()

        expect(sentPayload().from).toBe(`${REUNION_NAME} <reunion@${APP_DOMAIN}>`)
    })

    it('never sends from a no-reply address', async () => {
        await sendOne()

        expect(sentPayload().from).not.toMatch(/no-?reply/i)
    })

    /* The header the templates' "Reply to this email" depends on. */
    it('routes replies to a monitored inbox', async () => {
        await sendOne()

        expect(sentPayload().replyTo).toBe(CONTACT_EMAIL)
    })

    /* The SDK takes camelCase and serialises it itself. `reply_to` is accepted by the TYPE checker
       nowhere and dropped silently at runtime, so a well-meaning rename would break replies with no
       error anywhere. */
    it('uses the SDK spelling of the reply-to header', async () => {
        await sendOne()

        expect(sentPayload()).not.toHaveProperty('reply_to')
    })

    /* The contract every caller that commits state depends on — /register/recover rotates the
       management token only after a confirmed send, and the DB holds only the hash. */
    it('throws when Resend reports an error rather than resolving', async () => {
        mockSend.mockResolvedValue({ data: null, error: { message: 'Domain is not verified' } })

        await expect(sendOne()).rejects.toThrow('Domain is not verified')
    })

    it('passes an idempotency key through as an option', async () => {
        await send({
            to: 'alice@example.com',
            subject: 'Hello',
            text: 'Body',
            idempotencyKey: 'confirm/reg-1',
        })

        expect(mockSend.mock.calls[0][1]).toEqual({ idempotencyKey: 'confirm/reg-1' })
    })
})
