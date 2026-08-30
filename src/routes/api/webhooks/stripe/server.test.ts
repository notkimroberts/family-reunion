import { eq } from 'drizzle-orm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The Stripe webhook, against a real Postgres.

   This is the path where correctness is a database property rather than a code property. Both
   branches are idempotent because of a constraint, not because of an `if`:

   - the registration branch by a conditional `pending -> paid` UPDATE, so a redelivery matches no
     row and sends no second email;
   - the add_member branch by a UNIQUE index on stripe_checkout_session_id, so a redelivered insert
     is rejected atomically rather than by a read-then-insert two concurrent deliveries could both
     pass.

   The version this replaced could not exercise either. Its own comment said so: "That is a database
   guarantee, and this mock cannot exercise it", and the double-count guard had to be asserted as a
   structural property — that the fee travelled in the same `.set()` as the status — because
   asserting the fee was not written twice "would fail against correct code". Here the test simply
   delivers the same webhook twice and reads the column.

   Stripe and Resend stay mocked. `stripe` is mocked at the package so retrievePaymentFee runs for
   real against it — the expand chain it walks is part of what this covers. */

const { mockConstructEvent, mockPaymentIntentRetrieve } = vi.hoisted(() => ({
    mockConstructEvent: vi.fn(),
    mockPaymentIntentRetrieve: vi.fn(),
}))
const { mockSendEmail } = vi.hoisted(() => ({ mockSendEmail: vi.fn() }))
const { mockDbgStripe } = vi.hoisted(() => ({ mockDbgStripe: vi.fn() }))
const { mockReportError } = vi.hoisted(() => ({ mockReportError: vi.fn() }))

vi.mock('$env/dynamic/private', () => ({
    env: { STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test_mock' },
}))

/* Must be a regular function (not an arrow) so `new Stripe(...)` works. */
vi.mock('stripe', () => {
    function MockStripe() {
        return {
            webhooks: { constructEvent: mockConstructEvent },
            paymentIntents: { retrieve: mockPaymentIntentRetrieve },
        }
    }
    MockStripe.createFetchHttpClient = () => ({})
    return { default: MockStripe }
})

vi.mock('$lib/server/debug', () => ({ dbg: { stripe: mockDbgStripe, register: vi.fn() } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('$lib/server/email', () => ({ sendRegistrationConfirmation: mockSendEmail }))

const { POST } = await import('./+server')

let db: Awaited<ReturnType<typeof resetTestDb>>

function makeRequest(body: string, signature?: string): Parameters<typeof POST>[0] {
    const headers: Record<string, string> = {}
    if (signature !== undefined) {
        headers['stripe-signature'] = signature
    }
    const url = new URL('http://localhost/api/webhooks/stripe')
    return {
        request: new Request(url, { method: 'POST', body, headers }),
        url,
    } as unknown as Parameters<typeof POST>[0]
}

function deliver(session: unknown) {
    mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: session },
    })
    return POST(makeRequest('{}', 'sig'))
}

function registrationSession(registrationId: string, extra: Record<string, unknown> = {}) {
    return {
        id: 'cs_test_registration',
        metadata: {
            type: 'registration',
            registrationId,
            managementToken: 'plaintext-tok',
        },
        ...extra,
    }
}

function addMemberSession(registrationId: string, extra: Record<string, unknown> = {}) {
    return {
        id: 'cs_test_addmember_1',
        metadata: {
            type: 'add_member',
            registrationId,
            memberName: 'Marcus Patterson',
            memberTierId: 'tier-adult',
            memberTierLabel: 'Adult',
            memberPriceCents: '10300',
            memberVegetarianMeal: 'true',
            memberAttendedReunion2025: '',
        },
        ...extra,
    }
}

async function registrationRow(id: string) {
    const [row] = await db.select().from(registrations).where(eq(registrations.id, id))
    return row
}

async function membersOf(registrationId: string) {
    return db.select().from(partyMembers).where(eq(partyMembers.registrationId, registrationId))
}

describe('POST /api/webhooks/stripe', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockSendEmail.mockResolvedValue(undefined)
        /* 509 cents — what Stripe takes on the $165.09 an adult place is grossed up to. */
        mockPaymentIntentRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: 509 } },
        })
        db = await resetTestDb()
    })

    it('returns 400 when stripe-signature header is missing', async () => {
        expect((await POST(makeRequest('{}'))).status).toBe(400)
    })

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature')
        })
        expect((await POST(makeRequest('{}', 'bad-sig'))).status).toBe(400)
    })

    it('returns 200 for unhandled event types without changing anything', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })
        mockConstructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } })

        expect((await POST(makeRequest('{}', 'sig'))).status).toBe(200)
        expect((await registrationRow(seeded.registrationId)).status).toBe('pending')
    })

    it('returns 200 for checkout.session.completed with no/invalid metadata', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        expect((await deliver({ metadata: {} })).status).toBe(200)
        expect((await registrationRow(seeded.registrationId)).status).toBe('pending')
    })

    it('marks the registration paid and stamps when the money arrived', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        const res = await deliver(registrationSession(seeded.registrationId))

        expect(res.status).toBe(200)
        const row = await registrationRow(seeded.registrationId)
        expect(row.status).toBe('paid')
        expect(row.paidAt).toBeInstanceOf(Date)
    })

    it('logs and returns when the registration row is missing (orphan payment)', async () => {
        const res = await deliver(registrationSession('00000000-0000-0000-0000-000000000000'))

        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
        expect(mockDbgStripe).toHaveBeenCalledWith(
            expect.stringContaining('ORPHAN PAYMENT'),
            '00000000-0000-0000-0000-000000000000',
        )
    })

    /* THE idempotency guarantee, now exercised rather than described: deliver the same webhook
       twice and let the conditional UPDATE do its job. The second delivery matches no row, so no
       second email goes out. */
    it('sends exactly one email when Stripe redelivers the same session', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })
        const session = registrationSession(seeded.registrationId)

        await deliver(session)
        await deliver(session)

        expect(mockSendEmail).toHaveBeenCalledTimes(1)
        expect(mockDbgStripe).toHaveBeenCalledWith(
            expect.stringContaining('already fulfilled'),
            seeded.registrationId,
            'paid',
        )
        /* Distinguishable from the orphan path, which is also silent. */
        expect(mockDbgStripe).not.toHaveBeenCalledWith(
            expect.stringContaining('ORPHAN PAYMENT'),
            expect.anything(),
        )
    })

    it('does not flip a waived registration to paid on a stray webhook', async () => {
        const seeded = await seedRegistration(db, { status: 'waived' })

        await deliver(registrationSession(seeded.registrationId))

        expect((await registrationRow(seeded.registrationId)).status).toBe('waived')
        expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('emails the contact the manage link, the total and a per-registration key', async () => {
        const seeded = await seedRegistration(db, {
            status: 'pending',
            eventTitle: 'Family Reunion 2026',
            members: [
                { name: 'Alice', priceCents: 5000 },
                { name: 'Bo', priceCents: 2500 },
            ],
        })

        await deliver(registrationSession(seeded.registrationId))

        expect(mockSendEmail).toHaveBeenCalledWith(
            'alice@example.com',
            expect.objectContaining({
                eventTitle: 'Family Reunion 2026',
                manageUrl: expect.stringContaining('token=plaintext-tok'),
                status: 'paid',
                /* Summed from the rows, not from the session. */
                totalCents: 7500,
            }),
            `confirm/${seeded.registrationId}`,
        )
    })

    /* The payment is captured either way; failing the webhook would only make Stripe redeliver, and
       the conditional transition means the retry would not re-send anyway. */
    it('returns 200 and keeps the registration paid when the email throws', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })
        mockSendEmail.mockRejectedValue(new Error('Resend unavailable'))

        const res = await deliver(registrationSession(seeded.registrationId))

        expect(res.status).toBe(200)
        expect((await registrationRow(seeded.registrationId)).status).toBe('paid')
    })

    /* That send is the only one that will ever happen, so a failure reaching nobody leaves a paid
       registrant with no management link. */
    it('reports a failed confirmation email rather than swallowing it', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })
        mockSendEmail.mockRejectedValue(new Error('Resend unavailable'))

        await deliver(registrationSession(seeded.registrationId))

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('confirmation email failed'),
            expect.any(Error),
            { registrationId: seeded.registrationId },
        )
    })

    describe('recording the Stripe fee', () => {
        it('stores what the balance transaction says Stripe took', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })

            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(509)
        })

        it('asks Stripe about the payment intent from the session', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })

            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))

            expect(mockPaymentIntentRetrieve).toHaveBeenCalledWith(
                'pi_1',
                expect.objectContaining({ expand: ['latest_charge.balance_transaction'] }),
            )
        })

        /* THE double-count guard. The old test could only assert that the fee rode in the same
           .set() as the status, because its fake recorded the write regardless of how many rows the
           WHERE would have matched. Here the webhook is simply delivered twice. */
        it('does not count the fee twice when Stripe redelivers', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            const session = registrationSession(seeded.registrationId, { payment_intent: 'pi_1' })

            await deliver(session)
            await deliver(session)

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(509)
        })

        /* A fee that cannot be read must not blank a stored one, and must not stop the registration
           being marked paid — the payment is captured either way. */
        it('leaves the column null when Stripe cannot tell us the fee', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            mockPaymentIntentRetrieve.mockRejectedValue(new Error('stripe is down'))

            const res = await deliver(
                registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }),
            )

            expect(res.status).toBe(200)
            const row = await registrationRow(seeded.registrationId)
            expect(row.status).toBe('paid')
            expect(row.stripeFeeCents).toBeNull()
        })

        /* An add_member is a SECOND charge with its own 2.9% + 30¢, so its fee ADDS to what the
           initial checkout already cost. Assigning would silently discard the first — which is now
           a readable number rather than an assertion about the type of a SQL expression. */
        it('adds an add_member fee to the one already recorded', async () => {
            const seeded = await seedRegistration(db)
            await db
                .update(registrations)
                .set({ stripeFeeCents: 509 })
                .where(eq(registrations.id, seeded.registrationId))

            await deliver(addMemberSession(seeded.registrationId, { payment_intent: 'pi_2' }))

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(1018)
        })

        /* coalesce covers the rows that predate the column: the first add_member on an old
           registration must land a value rather than adding to null. */
        it('records an add_member fee on a registration that has none yet', async () => {
            const seeded = await seedRegistration(db)

            await deliver(addMemberSession(seeded.registrationId, { payment_intent: 'pi_2' }))

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(509)
        })

        /* The unique index rejects the duplicate insert, and the fee sits inside the same guard. */
        it('adds no fee when an add_member redelivery conflicts', async () => {
            const seeded = await seedRegistration(db)
            const session = addMemberSession(seeded.registrationId, { payment_intent: 'pi_2' })

            await deliver(session)
            await deliver(session)

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(509)
        })
    })

    describe('add_member', () => {
        it('inserts the member keyed on the checkout session id', async () => {
            const seeded = await seedRegistration(db)

            const res = await deliver(addMemberSession(seeded.registrationId))

            expect(res.status).toBe(200)
            const added = (await membersOf(seeded.registrationId)).find(
                (row) => row.name === 'Marcus Patterson',
            )
            expect(added).toMatchObject({
                tierLabel: 'Adult',
                priceCents: 10300,
                stripeCheckoutSessionId: 'cs_test_addmember_1',
                vegetarianMeal: true,
            })
        })

        /* An unanswered question must stay unknown rather than becoming false — catering reads this
           column and "no answer" is not "no". */
        it('keeps an unanswered question null rather than false', async () => {
            const seeded = await seedRegistration(db)

            await deliver(addMemberSession(seeded.registrationId))

            const added = (await membersOf(seeded.registrationId)).find(
                (row) => row.name === 'Marcus Patterson',
            )
            expect(added?.attendedReunion2025).toBeNull()
        })

        /* The dedupe used to be a read-then-insert with no constraint behind it, so two concurrent
           redeliveries could both pass the SELECT and insert two rows for one charge. */
        it('inserts one row however many times the webhook arrives', async () => {
            const seeded = await seedRegistration(db)
            const session = addMemberSession(seeded.registrationId)

            await deliver(session)
            await deliver(session)
            await deliver(session)

            expect(await membersOf(seeded.registrationId)).toHaveLength(2)
            expect(mockDbgStripe).toHaveBeenCalledWith(
                expect.stringContaining('already exists'),
                'cs_test_addmember_1',
            )
        })

        it('ignores add_member for a registration that no longer exists', async () => {
            const res = await deliver(addMemberSession('00000000-0000-0000-0000-000000000000'))

            expect(res.status).toBe(200)
            expect(await db.select().from(partyMembers)).toHaveLength(0)
        })

        it.each(['pending', 'refunded'] as const)(
            'ignores add_member when the parent is %s',
            async (status) => {
                const seeded = await seedRegistration(db, { status })

                const res = await deliver(addMemberSession(seeded.registrationId))

                expect(res.status).toBe(200)
                expect(await membersOf(seeded.registrationId)).toHaveLength(1)
            },
        )

        /* The old guard lived inside `if (paymentIntentId)`, so this path had none at all. */
        it('still inserts, and still dedupes, when Stripe sends no payment_intent', async () => {
            const seeded = await seedRegistration(db)
            const session = addMemberSession(seeded.registrationId, { payment_intent: null })

            await deliver(session)
            await deliver(session)

            const added = (await membersOf(seeded.registrationId)).filter(
                (row) => row.name === 'Marcus Patterson',
            )
            expect(added).toHaveLength(1)
            expect(added[0]).toMatchObject({
                stripePaymentIntentId: null,
                stripeCheckoutSessionId: 'cs_test_addmember_1',
            })
        })
    })
})
