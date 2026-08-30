import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './+server'

const { mockConstructEvent, mockPaymentIntentRetrieve } = vi.hoisted(() => ({
    mockConstructEvent: vi.fn(),
    mockPaymentIntentRetrieve: vi.fn(),
}))

const { mockTerminal, mockSet, mockReturning, mockValues, mockDb } = vi.hoisted(() => {
    /* Single terminal queue: each `await` on a builder pulls the next mocked value.
       Tests configure with `mockTerminal.mockResolvedValueOnce(...)` in call order. */
    const mockTerminal = vi.fn().mockResolvedValue([])
    const mockSet = vi.fn()
    const mockReturning = vi.fn().mockResolvedValue([])

    const chain: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        update: vi.fn(),
        set: mockSet,
        returning: mockReturning,
        insert: vi.fn(),
        values: vi.fn(),
        onConflictDoNothing: vi.fn(),
        transaction: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.from.mockReturnValue(chain)
    chain.where.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.insert.mockReturnValue(chain)
    chain.values.mockReturnValue(chain)
    chain.onConflictDoNothing.mockReturnValue(chain)
    mockSet.mockReturnValue(chain)
    chain.transaction.mockImplementation(async (cb: (tx: typeof chain) => Promise<void>) =>
        cb(chain),
    )
    /* Make chain thenable. Each await pulls one value from mockTerminal. */
    ;(chain as unknown as { then: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
        (mockTerminal as unknown as () => Promise<unknown>)().then(
            onFulfilled as (value: unknown) => unknown,
            onRejected as (reason: unknown) => unknown,
        )
    return { mockTerminal, mockSet, mockReturning, mockValues: chain.values, mockDb: chain }
})

const { mockSendEmail } = vi.hoisted(() => ({
    mockSendEmail: vi.fn().mockResolvedValue(undefined),
}))

const { mockDbgStripe } = vi.hoisted(() => ({
    mockDbgStripe: vi.fn(),
}))

const { mockReportError } = vi.hoisted(() => ({ mockReportError: vi.fn() }))

vi.mock('$env/dynamic/private', () => ({
    env: { STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test_mock' },
}))

/* Must use a regular function (not arrow) so new Stripe(...) works.

   paymentIntents is here so retrievePaymentFee runs for REAL against this mock rather than being
   stubbed out — the expand chain it walks is part of what these tests cover. Note that omitting it
   would not fail anything loudly: that function swallows every error by design, so the fee would
   silently come back undefined and the assertions would be vacuous. */
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

vi.mock('$lib/server/db', () => ({ db: mockDb }))
vi.mock('$lib/server/db/schema', () => ({
    registrations: {},
    reunionEvents: {},
    partyMembers: {},
}))
vi.mock('$lib/server/debug', () => ({ dbg: { stripe: mockDbgStripe } }))
vi.mock('$lib/server/reportError', () => ({ reportError: mockReportError }))
vi.mock('$lib/server/email', () => ({ sendRegistrationConfirmation: mockSendEmail }))
vi.mock('$lib/utils/age', () => ({ getAge: vi.fn().mockReturnValue(30), parseBirthDate: vi.fn() }))

const mockRegistration = {
    id: 'reg-123',
    eventId: 'event-456',
    contactName: 'Alice Smith',
    contactEmail: 'alice@example.com',
    status: 'paid',
}
/* metadata is NOT NULL DEFAULT '{}' on reunion_events, so a real row always has one — an event with
   no venue yet has {}, never undefined. */
const mockReunionEvent = { id: 'event-456', title: 'Family Reunion 2026', metadata: {} }
const mockMember = {
    id: 'member-1',
    name: 'Alice',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    shirtSize: 'M',
    priceCents: 5000,
    registrationId: 'reg-123',
}
const validSession = {
    metadata: {
        type: 'registration',
        registrationId: 'reg-123',
        managementToken: 'plaintext-tok',
    },
}

const addMemberSession = {
    id: 'cs_test_addmember_1',
    metadata: {
        type: 'add_member',
        registrationId: 'reg-123',
        memberName: 'Marcus Patterson',
        memberTierId: 'tier-adult',
        memberTierLabel: 'Adult',
        memberPriceCents: '10300',
        memberVegetarianMeal: 'true',
        memberAttendedReunion2025: '',
    },
}

function makeRequest(body: string, signature?: string): Parameters<typeof POST>[0] {
    const headers: Record<string, string> = {}
    if (signature !== undefined) {
        headers['stripe-signature'] = signature
    }
    const url = new URL('http://localhost/api/webhooks/stripe')
    return {
        request: new Request(url, {
            method: 'POST',
            body,
            headers,
        }),
        url,
    } as unknown as Parameters<typeof POST>[0]
}

/* Helper: queue terminals for the registration-branch happy path:
   1. update().returning() → [{id}]
   2. select().from().where() → [registration]
   3. Promise.all([event select, members select]) → [event], [members] */
function queueRegistrationHappyPath(
    reg = mockRegistration,
    evt = mockReunionEvent,
    mem = mockMember,
) {
    mockReturning.mockResolvedValueOnce([{ id: reg.id }])
    mockTerminal
        .mockResolvedValueOnce([reg])
        .mockResolvedValueOnce([evt])
        .mockResolvedValueOnce([mem])
}

describe('POST /api/webhooks/stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        /* mockReset (not just clearAllMocks) is required: clearAllMocks resets recorded calls
           but leaves queued mockResolvedValueOnce values in place, and one leaked value
           desynchronises the terminal queue for every test that follows. */
        mockTerminal.mockReset()
        mockReturning.mockReset()
        mockSendEmail.mockReset()
        mockSendEmail.mockResolvedValue(undefined)
        mockTerminal.mockResolvedValue([])
        mockReturning.mockResolvedValue([])
        mockSet.mockReturnValue(mockDb)
        /* 509 cents — what Stripe takes on the $165.09 an adult place is grossed up to. Needs a
           default: without one the mock resolves undefined, retrievePaymentFee throws reading
           .latest_charge off it, and its own catch turns that into "fee not known" — so every
           assertion about a stored fee would fail for a reason that looks nothing like the cause. */
        mockPaymentIntentRetrieve.mockReset()
        mockPaymentIntentRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: 509 } },
        })
    })

    it('returns 400 when stripe-signature header is missing', async () => {
        const res = await POST(makeRequest('{}'))
        expect(res.status).toBe(400)
    })

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature')
        })
        const res = await POST(makeRequest('{}', 'bad-sig'))
        expect(res.status).toBe(400)
    })

    it('returns 200 for unhandled event types without touching DB', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'payment_intent.created',
            data: { object: {} },
        })
        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockTerminal).not.toHaveBeenCalled()
    })

    it('returns 200 for checkout.session.completed with no/invalid metadata', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { metadata: {} } },
        })
        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockTerminal).not.toHaveBeenCalled()
    })

    it('marks registration as paid on checkout.session.completed', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        queueRegistrationHappyPath()

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
    })

    it('logs and returns when registration row is missing (orphan payment)', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockReturning.mockResolvedValueOnce([])
        mockTerminal.mockResolvedValueOnce([]) // status lookup finds no row

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
        expect(mockDbgStripe).toHaveBeenCalledWith(
            expect.stringContaining('ORPHAN PAYMENT'),
            'reg-123',
        )
    })

    /* Stripe redelivers checkout.session.completed on transient failures. The conditional
       UPDATE (pending → paid) matches nothing the second time, so no second email goes out.
       Asserted via the log line as well as the absence of an email, because "no email" alone
       is also true of the orphan-payment path — the two must stay distinguishable. */
    it('sends no second email when Stripe redelivers an already-paid session', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockReturning.mockResolvedValueOnce([]) // conditional update matched no row
        mockTerminal.mockResolvedValueOnce([{ status: 'paid' }]) // already fulfilled

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
        expect(mockDbgStripe).toHaveBeenCalledWith(
            expect.stringContaining('already fulfilled'),
            'reg-123',
            'paid',
        )
        expect(mockDbgStripe).not.toHaveBeenCalledWith(
            expect.stringContaining('ORPHAN PAYMENT'),
            expect.anything(),
        )
    })

    it('does not flip a waived registration to paid on a stray webhook', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockReturning.mockResolvedValueOnce([])
        mockTerminal.mockResolvedValueOnce([{ status: 'waived' }])

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
        expect(mockDbgStripe).toHaveBeenCalledWith(
            expect.stringContaining('already fulfilled'),
            'reg-123',
            'waived',
        )
    })

    it('passes a per-registration idempotency key to the confirmation email', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        queueRegistrationHappyPath()

        await POST(makeRequest('{}', 'sig'))
        expect(mockSendEmail).toHaveBeenCalledWith(
            'alice@example.com',
            expect.any(Object),
            'confirm/reg-123',
        )
    })

    it('sends confirmation email to registration.contactEmail with the manage URL and total', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        queueRegistrationHappyPath()

        await POST(makeRequest('{}', 'sig'))
        expect(mockSendEmail).toHaveBeenCalledWith(
            'alice@example.com',
            expect.objectContaining({
                eventTitle: 'Family Reunion 2026',
                manageUrl: expect.stringContaining('token=plaintext-tok'),
                status: 'paid',
                totalCents: 5000,
            }),
            'confirm/reg-123',
        )
    })

    it('returns 200 even when email sending throws', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        queueRegistrationHappyPath()
        mockSendEmail.mockRejectedValue(new Error('Resend unavailable'))

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
    })

    /* The conditional pending -> paid transition means a Stripe redelivery will not re-attempt
       the confirmation, so this send is the only one that will ever happen. A failure that
       reaches nobody leaves a paid registrant with no management link. */
    it('reports a failed confirmation email rather than swallowing it', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        queueRegistrationHappyPath()
        mockSendEmail.mockRejectedValue(new Error('Resend unavailable'))

        await POST(makeRequest('{}', 'sig'))

        expect(mockReportError).toHaveBeenCalledWith(
            expect.stringContaining('confirmation email failed'),
            expect.any(Error),
            { registrationId: 'reg-123' },
        )
    })

    it('skips email when reunionEvent is not found', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: validSession },
        })
        mockReturning.mockResolvedValueOnce([{ id: mockRegistration.id }])
        mockTerminal
            .mockResolvedValueOnce([mockRegistration])
            .mockResolvedValueOnce([]) // event not found
            .mockResolvedValueOnce([mockMember])

        const res = await POST(makeRequest('{}', 'sig'))
        expect(res.status).toBe(200)
        expect(mockSendEmail).not.toHaveBeenCalled()
    })

    /* The add_member branch had no coverage at all, despite being a money path. Its dedupe was
       a read-then-insert with no constraint behind it: two concurrent redeliveries could both
       pass the SELECT and insert two rows for one charge, and the guard was skipped entirely
       when payment_intent was null. It is now a UNIQUE index on the checkout session id. */
    /* The fee Stripe actually charged, stored so the admin panel can stop estimating at 2.9% + 30¢.

       What makes this delicate is that both write paths are also the idempotency guards, so a fee
       written in the wrong place is a fee counted twice on every Stripe redelivery. */
    describe('recording the Stripe fee', () => {
        /* The shared fixtures carry no payment_intent — several existing tests depend on that, and one
           asserts add_member still inserts without one. A fee only exists where a charge does, so these
           tests supply their own sessions that have one. */
        const paidSession = { ...validSession, payment_intent: 'pi_1' }
        const paidAddMemberSession = { ...addMemberSession, payment_intent: 'pi_2' }

        /* A session WITH a payment intent takes one extra DB write the shared helper does not queue:
           fulfillCheckout backfills the intent onto every party member. Queue it ahead of the three
           reads getConfirmationEmailData makes, or the event lookup returns the backfill's result and
           blows up on reunionEvent.metadata. */
        function queuePaidHappyPath() {
            mockReturning.mockResolvedValueOnce([{ id: mockRegistration.id }])
            mockTerminal
                .mockResolvedValueOnce([]) // party-member intent backfill
                .mockResolvedValueOnce([mockRegistration])
                .mockResolvedValueOnce([mockReunionEvent])
                .mockResolvedValueOnce([mockMember])
        }

        it('stores the fee from the balance transaction when marking paid', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidSession },
            })
            queuePaidHappyPath()

            await POST(makeRequest('{}', 'sig'))

            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ stripeFeeCents: 509 }))
        })

        it('asks Stripe about the payment intent from the session', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidSession },
            })
            queuePaidHappyPath()

            await POST(makeRequest('{}', 'sig'))

            expect(mockPaymentIntentRetrieve).toHaveBeenCalledWith(
                'pi_1',
                expect.objectContaining({ expand: ['latest_charge.balance_transaction'] }),
            )
        })

        /* THE double-count guard, asserted at the only level a mock can reach.

           What protects against a redelivery writing the fee twice is the WHERE clause —
           `id = ? AND status = 'pending'` — which matches nothing the second time. That is a database
           guarantee, and this mock cannot exercise it: drizzle calls .set() before .where(), so
           mockSet records the fee on every call regardless of how many rows the statement would touch.
           Asserting "set was not called with a fee" would therefore fail against correct code, which
           is exactly what it did when written that way.

           So assert the structural property instead: the fee travels in the SAME .set() as the status
           transition, and therefore under the same WHERE. If someone later moves it to its own
           db.update() — which would have no status condition — this fails. */
        it('writes the fee in the same conditional statement as the status transition', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidSession },
            })
            queuePaidHappyPath()

            await POST(makeRequest('{}', 'sig'))

            const feeWrites = mockSet.mock.calls.filter(
                ([written]) => written.stripeFeeCents !== undefined,
            )
            expect(feeWrites).toHaveLength(1)
            expect(feeWrites[0][0]).toMatchObject({ status: 'paid' })
        })

        /* And the transition it rides on really is conditional — the redelivery case, which the suite
           already covers for email, restated here for the fee. Nothing is committed because the WHERE
           matches no row, evidenced by the code taking the already-fulfilled branch. */
        it('commits nothing on a redelivery of an already-paid session', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidSession },
            })
            mockReturning.mockResolvedValueOnce([])
            mockTerminal.mockResolvedValueOnce([{ status: 'paid' }])

            await POST(makeRequest('{}', 'sig'))

            expect(mockDbgStripe).toHaveBeenCalledWith(
                expect.stringContaining('already fulfilled'),
                'reg-123',
                'paid',
            )
            /* The party-member intent backfill is the other write on this path, and it is downstream
               of the same early return. */
            expect(mockSet).toHaveBeenCalledTimes(1)
        })

        /* A fee that cannot be read must not blank a stored one, and must not stop the registration
           being marked paid — the payment is captured either way. */
        it('leaves the column alone when Stripe cannot tell us the fee', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidSession },
            })
            mockPaymentIntentRetrieve.mockRejectedValue(new Error('stripe is down'))
            queuePaidHappyPath()

            const res = await POST(makeRequest('{}', 'sig'))

            expect(res.status).toBe(200)
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
            expect(mockSet.mock.calls[0][0]).not.toHaveProperty('stripeFeeCents')
        })

        /* An add_member is a SECOND charge with its own 2.9% + 30¢, so its fee adds to what the
           initial checkout already cost. Assigning would silently discard the first. */
        it('adds an add_member fee to the registration rather than replacing it', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidAddMemberSession },
            })
            mockTerminal.mockResolvedValueOnce([{ status: 'paid' }])
            mockReturning.mockResolvedValueOnce([{ id: 'pm-new' }])

            await POST(makeRequest('{}', 'sig'))

            const written = mockSet.mock.calls.at(-1)?.[0]
            expect(written).toHaveProperty('stripeFeeCents')
            /* A SQL expression — coalesce(existing, 0) + 509 — not a bare number. */
            expect(typeof written.stripeFeeCents).not.toBe('number')
        })

        /* The add_member insert is deduped by a unique index on the checkout session id. On a
           conflict the parent is not touched, so the fee is not added twice either. */
        it('adds no fee when an add_member redelivery conflicts', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: paidAddMemberSession },
            })
            mockTerminal.mockResolvedValueOnce([{ status: 'paid' }])
            mockReturning.mockResolvedValueOnce([])

            await POST(makeRequest('{}', 'sig'))

            expect(mockSet).not.toHaveBeenCalled()
        })
    })

    describe('add_member', () => {
        function queueAddMemberHappyPath(parentStatus = 'paid') {
            mockTerminal.mockResolvedValueOnce([{ status: parentStatus }]) // parent lookup
            mockReturning.mockResolvedValueOnce([{ id: 'member-new' }]) // insert returned a row
        }

        it('inserts the member keyed on the checkout session id', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: addMemberSession },
            })
            queueAddMemberHappyPath()

            const res = await POST(makeRequest('{}', 'sig'))

            expect(res.status).toBe(200)
            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    registrationId: 'reg-123',
                    name: 'Marcus Patterson',
                    tierLabel: 'Adult',
                    priceCents: 10300,
                    stripeCheckoutSessionId: 'cs_test_addmember_1',
                    vegetarianMeal: true,
                }),
            )
            expect(mockDb.onConflictDoNothing).toHaveBeenCalled()
        })

        /* An unanswered question must stay unknown rather than becoming false — catering reads
           this column and "no answer" is not "no". */
        it('keeps an unanswered question null rather than false', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: addMemberSession },
            })
            queueAddMemberHappyPath()

            await POST(makeRequest('{}', 'sig'))

            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({ attendedReunion2025: null }),
            )
        })

        /* The conflict path: the insert returns no rows, so the parent must not be touched. */
        it('does not touch the registration when a redelivery conflicts', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: addMemberSession },
            })
            mockTerminal.mockResolvedValueOnce([{ status: 'paid' }])
            mockReturning.mockResolvedValueOnce([]) // UNIQUE index rejected the duplicate

            const res = await POST(makeRequest('{}', 'sig'))

            expect(res.status).toBe(200)
            expect(mockSet).not.toHaveBeenCalled()
            expect(mockDbgStripe).toHaveBeenCalledWith(
                expect.stringContaining('already exists'),
                'cs_test_addmember_1',
            )
        })

        it('ignores add_member for a registration that no longer exists', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: addMemberSession },
            })
            mockTerminal.mockResolvedValueOnce([]) // parent gone

            const res = await POST(makeRequest('{}', 'sig'))

            expect(res.status).toBe(200)
            expect(mockValues).not.toHaveBeenCalled()
        })

        it.each(['pending', 'refunded'])(
            'ignores add_member when the parent is %s',
            async (status) => {
                mockConstructEvent.mockReturnValue({
                    type: 'checkout.session.completed',
                    data: { object: addMemberSession },
                })
                mockTerminal.mockResolvedValueOnce([{ status }])

                const res = await POST(makeRequest('{}', 'sig'))

                expect(res.status).toBe(200)
                expect(mockValues).not.toHaveBeenCalled()
            },
        )

        it('still inserts when Stripe sends no payment_intent', async () => {
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: { ...addMemberSession, payment_intent: null } },
            })
            queueAddMemberHappyPath()

            await POST(makeRequest('{}', 'sig'))

            /* The old guard was inside `if (paymentIntentId)`, so this path had none. */
            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    stripePaymentIntentId: null,
                    stripeCheckoutSessionId: 'cs_test_addmember_1',
                }),
            )
        })
    })
})
