import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { donations, partyMembers, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedEvent } from '$lib/server/testing/seedEvent'
import { seedRegistration } from '$lib/server/testing/seedRegistration'
import { STRIPE_RADAR_FEE_CENTS } from '$lib/utils/stripeFee'

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
   structural property — that the fee traveled in the same `.set()` as the status — because
   asserting the fee was not written twice "would fail against correct code". Here the test simply
   delivers the same webhook twice and reads the column.

   Stripe and Resend stay mocked. `stripe` is mocked at the package so retrievePaymentFee runs for
   real against it — the expand chain it walks is part of what this covers. */

const { mockConstructEvent, mockPaymentIntentRetrieve } = vi.hoisted(() => ({
    mockConstructEvent: vi.fn(),
    mockPaymentIntentRetrieve: vi.fn(),
}))
const { mockSendEmail, mockSendReceipt } = vi.hoisted(() => ({
    mockSendEmail: vi.fn(),
    mockSendReceipt: vi.fn(),
}))
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
vi.mock('$lib/server/email', () => ({
    sendRegistrationConfirmation: mockSendEmail,
    sendDonationReceipt: mockSendReceipt,
}))

/* What the charge's balance transaction says Stripe took on the $165.09 an adult place is grossed up
   to, and what the app records: that plus Radar's fee, which Stripe bills outside it. */
const PROCESSING_FEE_CENTS = 509
const RECORDED_FEE_CENTS = PROCESSING_FEE_CENTS + STRIPE_RADAR_FEE_CENTS

const { POST } = await import('./+server')
const { markRegistrationRefunded } = await import('$lib/server/registrations/lifecycle')

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
            viewToken: 'plaintext-tok',
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

function donationSession(donationId: string, extra: Record<string, unknown> = {}) {
    return { id: 'cs_test_donation', metadata: { type: 'donation', donationId }, ...extra }
}

async function seedDonation(
    values: Partial<typeof donations.$inferInsert> & { eventId?: string } = {},
) {
    const [row] = await db
        .insert(donations)
        .values({
            donorName: 'Ruth Patterson',
            donorEmail: 'ruth@example.com',
            amountCents: 5000,
            status: 'pending',
            ...values,
        })
        .returning({ id: donations.id })
    return row.id
}

async function donationRow(id: string) {
    const [row] = await db.select().from(donations).where(eq(donations.id, id))
    return row
}

async function membersOf(registrationId: string) {
    return db.select().from(partyMembers).where(eq(partyMembers.registrationId, registrationId))
}

describe('POST /api/webhooks/stripe', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockSendEmail.mockResolvedValue(undefined)
        mockSendReceipt.mockResolvedValue(undefined)
        mockPaymentIntentRetrieve.mockResolvedValue({
            latest_charge: { balance_transaction: { fee: PROCESSING_FEE_CENTS } },
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

    it('emails the contact the view link, the total and a per-registration key', async () => {
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
                viewUrl: expect.stringContaining('token=plaintext-tok'),
                status: 'paid',
                /* Summed from the rows, not from the session. */
                totalCents: 7500,
            }),
            `confirm/${seeded.registrationId}`,
        )
    })

    /* The webhook is the one writer of the registration's payment intent, so its own confirmation
       is the one that says the card went through and that prices include the fee. */
    it('tells the confirmation the booking was paid by card', async () => {
        const seeded = await seedRegistration(db, { status: 'pending' })

        await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_card' }))

        expect(mockSendEmail).toHaveBeenCalledWith(
            'alice@example.com',
            expect.objectContaining({ status: 'paid', paidByCard: true }),
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
       registrant with no view link. */
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

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
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

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
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

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                509 + RECORDED_FEE_CENTS,
            )
        })

        /* coalesce covers the rows that predate the column: the first add_member on an old
           registration must land a value rather than adding to null. */
        it('records an add_member fee on a registration that has none yet', async () => {
            const seeded = await seedRegistration(db)

            await deliver(addMemberSession(seeded.registrationId, { payment_intent: 'pi_2' }))

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })

        /* The unique index rejects the duplicate insert, and the fee sits inside the same guard. */
        it('adds no fee when an add_member redelivery conflicts', async () => {
            const seeded = await seedRegistration(db)
            const session = addMemberSession(seeded.registrationId, { payment_intent: 'pi_2' })

            await deliver(session)
            await deliver(session)

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })
    })

    /* What a real payment looks like (the e2e run, 2026-10-27): at checkout.session.completed the
       charge has no balance transaction yet; Stripe attaches it about three seconds later and sends
       charge.updated. The fee must be recorded then — and once, whichever event reads it first. */
    describe('the fee arriving with charge.updated', () => {
        const NO_BALANCE_TRANSACTION = { latest_charge: { balance_transaction: null } }

        function deliverChargeUpdated(
            paymentIntent: string,
            balanceTransaction: string | null = 'txn_1',
        ) {
            mockConstructEvent.mockReturnValue({
                type: 'charge.updated',
                data: {
                    object: {
                        payment_intent: paymentIntent,
                        balance_transaction: balanceTransaction,
                    },
                },
            })
            return POST(makeRequest('{}', 'sig'))
        }

        it('records the fee when it was not there at fulfillment', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            mockPaymentIntentRetrieve.mockResolvedValueOnce(NO_BALANCE_TRANSACTION)
            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))
            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBeNull()

            const res = await deliverChargeUpdated('pi_1')

            expect(res.status).toBe(200)
            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })

        it('does not count it twice when charge.updated is redelivered or repeats', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            mockPaymentIntentRetrieve.mockResolvedValueOnce(NO_BALANCE_TRANSACTION)
            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))

            await deliverChargeUpdated('pi_1')
            await deliverChargeUpdated('pi_1')

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })

        it('does not add it again when fulfillment had already recorded it', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))

            await deliverChargeUpdated('pi_1')

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })

        /* Events are not ordered. charge.updated first finds no booking with the intent; the
           fulfillment that follows reads the fee itself. */
        it('records it at fulfillment when charge.updated arrived first', async () => {
            /* An unpaid booking carries no intent anywhere yet — the seed's default member has one. */
            const seeded = await seedRegistration(db, {
                status: 'pending',
                members: [
                    { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: null },
                ],
            })

            await deliverChargeUpdated('pi_1')
            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBeNull()
            await deliver(registrationSession(seeded.registrationId, { payment_intent: 'pi_1' }))

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
        })

        it('asks Stripe nothing while the charge has no balance transaction', async () => {
            await deliverChargeUpdated('pi_1', null)

            expect(mockPaymentIntentRetrieve).not.toHaveBeenCalled()
        })

        it('records a standalone gift’s fee on the gift', async () => {
            const donationId = await seedDonation()
            mockPaymentIntentRetrieve.mockResolvedValueOnce(NO_BALANCE_TRANSACTION)
            await deliver(donationSession(donationId, { payment_intent: 'pi_gift' }))

            await deliverChargeUpdated('pi_gift')

            expect((await donationRow(donationId)).stripeFeeCents).toBe(RECORDED_FEE_CENTS)
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
                /* The session carried only the gross, so the fee inside it is recovered at the write:
                   10300 is the gross-up of 9971. */
                cardFeeCents: 329,
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

    /* Gifts. Same idempotency shape as the registration branch — a conditional pending -> paid
       UPDATE — so the interesting assertions are about what a REDELIVERY does not do. */
    describe('donation', () => {
        it('marks the gift paid, records the fee and thanks the donor', async () => {
            const eventId = await seedEvent(db, { title: 'Patterson Family Reunion 2027' })
            const donationId = await seedDonation({ eventId })

            const res = await deliver(donationSession(donationId, { payment_intent: 'pi_gift' }))

            expect(res.status).toBe(200)
            const row = await donationRow(donationId)
            expect(row.status).toBe('paid')
            expect(row.paidAt).toBeInstanceOf(Date)
            expect(row.stripeFeeCents).toBe(RECORDED_FEE_CENTS)
            expect(mockSendReceipt).toHaveBeenCalledWith(
                'ruth@example.com',
                {
                    donorName: 'Ruth Patterson',
                    eventTitle: 'Patterson Family Reunion 2027',
                    amountCents: 5000,
                    givenOn: expect.any(Date),
                    siteOrigin: expect.any(String),
                },
                `donation/${donationId}`,
            )
        })

        /* THE idempotency guarantee for gifts: a redelivery must not thank the same donor twice. */
        it('sends exactly one receipt when Stripe redelivers', async () => {
            const donationId = await seedDonation()
            const session = donationSession(donationId, { payment_intent: 'pi_gift' })

            await deliver(session)
            await deliver(session)

            expect(mockSendReceipt).toHaveBeenCalledTimes(1)
        })

        /* A gift can arrive with no reunion open — eventId is nullable — and the receipt still has
           to render, so the template is handed a fallback rather than an empty title. */
        it('still thanks a donor whose gift is attached to no reunion', async () => {
            const donationId = await seedDonation()

            await deliver(donationSession(donationId))

            expect(mockSendReceipt).toHaveBeenCalledWith(
                'ruth@example.com',
                expect.objectContaining({ eventTitle: 'the family reunion' }),
                `donation/${donationId}`,
            )
        })

        it('reports a failed receipt rather than swallowing it', async () => {
            const donationId = await seedDonation()
            mockSendReceipt.mockRejectedValue(new Error('Resend unavailable'))

            const res = await deliver(donationSession(donationId))

            expect(res.status).toBe(200)
            expect((await donationRow(donationId)).status).toBe('paid')
            expect(mockReportError).toHaveBeenCalledWith(
                expect.stringContaining('donation receipt failed'),
                expect.any(Error),
                { donationId },
            )
        })

        it('ignores a donation webhook for a row that no longer exists', async () => {
            const res = await deliver(donationSession('00000000-0000-0000-0000-000000000000'))

            expect(res.status).toBe(200)
            expect(mockSendReceipt).not.toHaveBeenCalled()
        })
    })

    /* A gift added to a registration checkout: one session, one charge, two rows to settle. */
    describe('a gift given with a registration', () => {
        it('marks the gift paid alongside the registration', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            const donationId = await seedDonation({
                eventId: seeded.eventId,
                registrationId: seeded.registrationId,
                amountCents: 2500,
            })

            await deliver(
                registrationSession(seeded.registrationId, {
                    payment_intent: 'pi_1',
                    metadata: {
                        type: 'registration',
                        registrationId: seeded.registrationId,
                        viewToken: 'plaintext-tok',
                        donationId,
                    },
                }),
            )

            expect((await donationRow(donationId)).status).toBe('paid')
        })

        /* THE double-count guard for gifts. The session has ONE balance transaction, already
           recorded on the registration; writing it on the gift as well would deduct Stripe's cut
           twice across the two admin figures. */
        it('leaves the fee on the registration and not on the gift', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            const donationId = await seedDonation({
                eventId: seeded.eventId,
                registrationId: seeded.registrationId,
            })

            await deliver(
                registrationSession(seeded.registrationId, {
                    payment_intent: 'pi_1',
                    metadata: {
                        type: 'registration',
                        registrationId: seeded.registrationId,
                        viewToken: 'plaintext-tok',
                        donationId,
                    },
                }),
            )

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
            expect((await donationRow(donationId)).stripeFeeCents).toBeNull()
        })

        /* The confirmation is the only message this registrant gets, so the gift has to be named in
           it — and the total has to be what the card was charged, or it reads as an overcharge. */
        it('names the gift in the confirmation and includes it in the total', async () => {
            const seeded = await seedRegistration(db, {
                status: 'pending',
                members: [{ name: 'Alice', priceCents: 5000 }],
            })
            const donationId = await seedDonation({
                eventId: seeded.eventId,
                registrationId: seeded.registrationId,
                amountCents: 2500,
            })

            await deliver(
                registrationSession(seeded.registrationId, {
                    metadata: {
                        type: 'registration',
                        registrationId: seeded.registrationId,
                        viewToken: 'plaintext-tok',
                        donationId,
                    },
                }),
            )

            expect(mockSendEmail).toHaveBeenCalledWith(
                'alice@example.com',
                expect.objectContaining({ donationCents: 2500, totalCents: 7500 }),
                `confirm/${seeded.registrationId}`,
            )
        })

        /* A registration without a gift must not grow a donation line from nowhere. */
        it('says nothing about a gift when there was none', async () => {
            const seeded = await seedRegistration(db, {
                status: 'pending',
                members: [{ name: 'Alice', priceCents: 5000 }],
            })

            await deliver(registrationSession(seeded.registrationId))

            expect(mockSendEmail).toHaveBeenCalledWith(
                'alice@example.com',
                expect.objectContaining({ donationCents: undefined, totalCents: 5000 }),
                `confirm/${seeded.registrationId}`,
            )
        })

        /* The gift is marked inside the branch only a successful transition reaches, so a
           redelivery cannot re-stamp its paidAt. */
        it('does not re-stamp the gift when Stripe redelivers', async () => {
            const seeded = await seedRegistration(db, { status: 'pending' })
            const donationId = await seedDonation({
                eventId: seeded.eventId,
                registrationId: seeded.registrationId,
            })
            const session = registrationSession(seeded.registrationId, {
                metadata: {
                    type: 'registration',
                    registrationId: seeded.registrationId,
                    viewToken: 'plaintext-tok',
                    donationId,
                },
            })

            await deliver(session)
            const firstPaidAt = (await donationRow(donationId)).paidAt
            await deliver(session)

            expect((await donationRow(donationId)).paidAt).toEqual(firstPaidAt)
            /* And no gift receipt: the confirmation email names the gift instead. */
            expect(mockSendReceipt).not.toHaveBeenCalled()
        })
    })

    /* A card payment from /register/pay for people an organizer added to a paid booking. Idempotent
       by a conditional UPDATE on payment_due = true, so a redelivery settles nobody, adds no fee
       and sends no email. */
    describe('member_payment', () => {
        const CHILD_NET = 10000
        const CHILD_GROSS = 10330

        async function seedOwedBooking() {
            return seedRegistration(db, {
                members: [
                    { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                    {
                        name: 'Jada Patterson',
                        priceCents: CHILD_NET,
                        tierLabel: 'Child',
                        paymentDue: true,
                    },
                ],
            })
        }

        function memberPaymentSession(
            registrationId: string,
            memberCharges: string,
            extra: Record<string, unknown> = {},
        ) {
            return {
                id: 'cs_test_member_payment',
                payment_intent: 'pi_2',
                metadata: {
                    type: 'member_payment',
                    registrationId,
                    viewToken: 'plaintext-tok',
                    memberCharges,
                },
                ...extra,
            }
        }

        async function memberRow(id: string) {
            const [row] = await db.select().from(partyMembers).where(eq(partyMembers.id, id))
            return row
        }

        /* The gross is what the card paid, and the intent is what cancellation refunds — both must
           land on the member row. */
        it('settles the owed member at the gross, on its own payment intent', async () => {
            const seeded = await seedOwedBooking()
            const owedId = seeded.memberIds[1]

            const res = await deliver(
                memberPaymentSession(seeded.registrationId, `${owedId}:${CHILD_GROSS}`),
            )

            expect(res.status).toBe(200)
            expect(await memberRow(owedId)).toMatchObject({
                paymentDue: false,
                priceCents: CHILD_GROSS,
                /* The gross less the net that was stored — the fee inside the new price. */
                cardFeeCents: CHILD_GROSS - CHILD_NET,
                stripePaymentIntentId: 'pi_2',
            })
            /* The people who paid before are untouched. */
            expect(await memberRow(seeded.memberIds[0])).toMatchObject({
                priceCents: 16509,
                stripePaymentIntentId: 'pi_1',
            })
        })

        it('adds its fee to the one already recorded', async () => {
            const seeded = await seedOwedBooking()
            await db
                .update(registrations)
                .set({ stripeFeeCents: 509 })
                .where(eq(registrations.id, seeded.registrationId))

            await deliver(
                memberPaymentSession(
                    seeded.registrationId,
                    `${seeded.memberIds[1]}:${CHILD_GROSS}`,
                ),
            )

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                509 + RECORDED_FEE_CENTS,
            )
        })

        it('confirms by email, keyed on the session', async () => {
            const seeded = await seedOwedBooking()

            await deliver(
                memberPaymentSession(
                    seeded.registrationId,
                    `${seeded.memberIds[1]}:${CHILD_GROSS}`,
                ),
            )

            expect(mockSendEmail).toHaveBeenCalledWith(
                'alice@example.com',
                expect.objectContaining({
                    status: 'paid',
                    viewUrl: expect.stringContaining('token=plaintext-tok'),
                    /* Nothing is owed any more, so the email does not ask for money. */
                    amountDue: undefined,
                    totalCents: 16509 + CHILD_GROSS,
                }),
                'member-payment/cs_test_member_payment',
            )
        })

        it('settles once, counts the fee once and emails once when Stripe redelivers', async () => {
            const seeded = await seedOwedBooking()
            const session = memberPaymentSession(
                seeded.registrationId,
                `${seeded.memberIds[1]}:${CHILD_GROSS}`,
            )

            await deliver(session)
            await deliver(session)

            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
            expect(mockSendEmail).toHaveBeenCalledTimes(1)
            /* A redelivery is routine, not a double payment. */
            expect(mockReportError).not.toHaveBeenCalled()
        })

        /* The organizer recorded a check while the payer was on Stripe's page. The money is
           captured, so the only useful thing is to say so loudly. */
        it('reports a payment for someone already settled by hand, and changes nothing', async () => {
            const seeded = await seedOwedBooking()
            const owedId = seeded.memberIds[1]
            await db
                .update(partyMembers)
                .set({ paymentDue: false })
                .where(eq(partyMembers.id, owedId))

            const res = await deliver(
                memberPaymentSession(seeded.registrationId, `${owedId}:${CHILD_GROSS}`),
            )

            expect(res.status).toBe(200)
            expect(mockReportError).toHaveBeenCalledWith(
                expect.stringContaining('refund their share by hand'),
                expect.any(Error),
                expect.objectContaining({ memberIds: owedId, paymentIntentId: 'pi_2' }),
            )
            expect(await memberRow(owedId)).toMatchObject({
                priceCents: CHILD_NET,
                stripePaymentIntentId: null,
            })
            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBeNull()
            expect(mockSendEmail).not.toHaveBeenCalled()
        })

        it('settles who is still owed and reports who is not', async () => {
            const seeded = await seedRegistration(db, {
                members: [
                    { name: 'Alice Patterson', priceCents: 16509, stripePaymentIntentId: 'pi_1' },
                    { name: 'Jada', priceCents: CHILD_NET, paymentDue: true },
                    { name: 'Marcus', priceCents: CHILD_NET, paymentDue: false },
                ],
            })
            const [, jadaId, marcusId] = seeded.memberIds

            await deliver(
                memberPaymentSession(
                    seeded.registrationId,
                    `${jadaId}:${CHILD_GROSS},${marcusId}:${CHILD_GROSS}`,
                ),
            )

            expect((await memberRow(jadaId)).paymentDue).toBe(false)
            expect((await memberRow(marcusId)).priceCents).toBe(CHILD_NET)
            expect(mockReportError).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Error),
                expect.objectContaining({ memberIds: marcusId }),
            )
            expect((await registrationRow(seeded.registrationId)).stripeFeeCents).toBe(
                RECORDED_FEE_CENTS,
            )
            expect(mockSendEmail).toHaveBeenCalledTimes(1)
        })

        /* Cancelled while the payer was on Stripe's page: settling someone on a refunded booking
           would revive a place nobody is catering for. */
        it('reports a payment on a booking cancelled meanwhile, and settles nobody', async () => {
            const seeded = await seedOwedBooking()
            /* What cancelling does to an owed place: no flag, nothing charged. */
            await markRegistrationRefunded(seeded.registrationId)

            await deliver(
                memberPaymentSession(
                    seeded.registrationId,
                    `${seeded.memberIds[1]}:${CHILD_GROSS}`,
                ),
            )

            expect(mockReportError).toHaveBeenCalledWith(
                expect.stringContaining('refund their share by hand'),
                expect.any(Error),
                expect.objectContaining({ registrationId: seeded.registrationId }),
            )
            expect((await memberRow(seeded.memberIds[1])).priceCents).toBe(0)
            expect(mockSendEmail).not.toHaveBeenCalled()
        })
    })

    /* Routing only; what the handler deletes is pinned in handleExpiredCheckout.test.ts. */
    describe('checkout.session.expired', () => {
        it('removes an expired duplicate of a booking the same email paid', async () => {
            const paid = await seedRegistration(db, { status: 'paid' })
            const abandoned = await seedRegistration(db, {
                eventId: paid.eventId,
                status: 'pending',
                stripeSessionId: 'cs_test_registration',
            })
            mockConstructEvent.mockReturnValue({
                type: 'checkout.session.expired',
                data: { object: registrationSession(abandoned.registrationId) },
            })

            const response = await POST(makeRequest('{}', 'sig'))

            expect(response.status).toBe(200)
            expect(await registrationRow(abandoned.registrationId)).toBeUndefined()
            expect(await registrationRow(paid.registrationId)).toBeDefined()
        })
    })
})
