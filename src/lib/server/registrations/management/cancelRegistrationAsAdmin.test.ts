import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { donations, registrations } from '$lib/server/db/schema'
import { resetTestDb } from '$lib/server/db/testing/resetTestDb'
import { seedRegistration } from '$lib/server/testing/seedRegistration'

/* The organiser's cancel, which exists because a paper registration could not be cancelled at all:
   setRegistrationStatus refuses 'refunded' in both directions, and cancelRegistration needs the
   management token, which is only ever stored as a hash.

   These tests cover what is specific to the ADMIN path — the event pairing, the already-cancelled
   no-op, and that a cheque registration cancels without touching Stripe. The refund contract itself
   (loud failure, one fee per intent, the email) lives in _performCancellation and is covered by
   cancelRegistration.test.ts, which exercises the same function through the registrant's route. */

const mockRefund = vi.fn()
const mockRetrieveIntent = vi.fn()
const mockSendCancellation = vi.fn()

vi.mock('$lib/server/payments', () => ({
    refundPaymentIntent: mockRefund,
    retrieveSessionPaymentIntent: mockRetrieveIntent,
}))
vi.mock('$lib/server/email', () => ({ sendCancellationEmail: mockSendCancellation }))
vi.mock('$lib/server/reportError', () => ({ reportError: vi.fn() }))

const { cancelRegistrationAsAdmin } = await import('./cancelRegistrationAsAdmin')

const REGISTER_URL = 'https://example.com/register'

let db: Awaited<ReturnType<typeof resetTestDb>>

/* A cheque registration: paid, but never through Checkout. The case the feature was added for. */
const PAPER_PAID = {
    stripeSessionId: null,
    contactName: 'Wanda Trantow',
    contactEmail: 'wanda@example.com',
    members: [{ name: 'Wanda', priceCents: 16000, stripePaymentIntentId: null }],
} as const

async function statusOf(registrationId: string) {
    const [row] = await db
        .select({ status: registrations.status })
        .from(registrations)
        .where(eq(registrations.id, registrationId))
    return row.status
}

describe('cancelRegistrationAsAdmin', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mockRefund.mockResolvedValue(undefined)
        mockRetrieveIntent.mockResolvedValue(null)
        mockSendCancellation.mockResolvedValue(undefined)
        db = await resetTestDb()
    })

    /* THE case this exists for: money arrived as a cheque, so there is nothing for Stripe to refund and
       the cancellation must still go through. */
    it('cancels a paper registration without touching Stripe', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID })

        await cancelRegistrationAsAdmin({
            registrationId: seeded.registrationId,
            eventId: seeded.eventId,
            registerUrl: REGISTER_URL,
        })

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockRetrieveIntent).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    /* And it tells them the truth about the money: 'by_hand', not a promised card refund. */
    it('emails a paper registrant that their refund is arranged, not automatic', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID })

        await cancelRegistrationAsAdmin({
            registrationId: seeded.registrationId,
            eventId: seeded.eventId,
            registerUrl: REGISTER_URL,
        })

        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('by_hand')
    })

    /* A card payment must still be refunded when an organiser cancels on someone's behalf. Restricting
       this to paper registrations would leave the harder half of the job undone. */
    it('refunds a card payment when the organiser cancels', async () => {
        const seeded = await seedRegistration(db, {
            members: [{ name: 'Wanda', priceCents: 16509, stripePaymentIntentId: 'pi_1' }],
        })

        await cancelRegistrationAsAdmin({
            registrationId: seeded.registrationId,
            eventId: seeded.eventId,
            registerUrl: REGISTER_URL,
        })

        expect(mockRefund).toHaveBeenCalledWith(
            'pi_1',
            undefined,
            expect.stringContaining(seeded.registrationId),
        )
    })

    /* The pairing invariant, enforced at the write rather than trusted from the route: a URL naming one
       year must not cancel another year's registration. */
    it('404s when the registration belongs to a different event', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID })
        const otherYear = await seedRegistration(db, {
            eventTitle: 'Patterson Family Reunion 2028',
            eventStatus: 'closed',
            status: 'pending',
            stripeSessionId: null,
        })

        await expect(
            cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: otherYear.eventId,
                registerUrl: REGISTER_URL,
            }),
        ).rejects.toThrow()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSendCancellation).not.toHaveBeenCalled()
        expect(await statusOf(seeded.registrationId)).toBe('paid')
    })

    it('404s on a registration that does not exist', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID })

        await expect(
            cancelRegistrationAsAdmin({
                registrationId: '00000000-0000-0000-0000-000000000000',
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            }),
        ).rejects.toThrow()

        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    /* A double-submitted dialog must not email a second cancellation. Quietly doing nothing is right
       here — the end state the organiser asked for already holds. */
    it('does nothing when the registration is already cancelled', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID, status: 'refunded' })

        await expect(
            cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            }),
        ).resolves.toBeUndefined()

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSendCancellation).not.toHaveBeenCalled()
    })

    /* An unpaid paper entry — someone who never sent the cheque. Nothing to refund, and the email must
       not imply otherwise. */
    it('closes an unpaid registration with nothing to refund', async () => {
        const seeded = await seedRegistration(db, { ...PAPER_PAID, status: 'pending' })

        await cancelRegistrationAsAdmin({
            registrationId: seeded.registrationId,
            eventId: seeded.eventId,
            registerUrl: REGISTER_URL,
        })

        expect(mockRefund).not.toHaveBeenCalled()
        expect(mockSendCancellation.mock.calls[0][1].refundRoute).toBe('nothing_paid')
        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    /* No lock-date check, unlike the registrant's own cancel: assertRegistrationEditable stops a
       REGISTRANT editing after numbers have gone to the caterer, which is not a rule organisers need
       protecting from. Someone dropping out late is exactly what this has to record.

       This used to be asserted by reading the source file and grepping it for the guard's NAME. With a
       real database the rule can be stated as behaviour instead: a locked event, and the cancellation
       still goes through. */
    it('cancels after the registration lock date has passed', async () => {
        const seeded = await seedRegistration(db, {
            ...PAPER_PAID,
            registrationLockDate: new Date('2020-01-01'),
        })

        await cancelRegistrationAsAdmin({
            registrationId: seeded.registrationId,
            eventId: seeded.eventId,
            registerUrl: REGISTER_URL,
        })

        expect(await statusOf(seeded.registrationId)).toBe('refunded')
    })

    /* A GIFT IS NOT REFUNDED WITH THE BOOKING — the reunion keeps it. But a gift added during
       registration was a line item on the SAME charge, and Stripe refunds charges rather than line
       items, so keeping it means refunding less than the charge. Leaving the donations row alone
       would not have been enough: the money would have gone back regardless. */
    describe('a gift given with the booking', () => {
        async function seedWithGift(intentId: string | null) {
            const seeded = await seedRegistration(db, {
                members: [{ name: 'Wanda', priceCents: 16509, stripePaymentIntentId: 'pi_1' }],
            })
            const [gift] = await db
                .insert(donations)
                .values({
                    eventId: seeded.eventId,
                    registrationId: seeded.registrationId,
                    donorName: 'Wanda Trantow',
                    donorEmail: 'wanda@example.com',
                    amountCents: 5000,
                    status: 'paid',
                    stripePaymentIntentId: intentId,
                })
                .returning({ id: donations.id })
            return { ...seeded, giftId: gift.id }
        }

        async function giftStatus(giftId: string) {
            const [row] = await db
                .select({ status: donations.status })
                .from(donations)
                .where(eq(donations.id, giftId))
            return row.status
        }

        /* THE case. A full refund here would return $215.09 — the place AND the gift. */
        it('refunds the place only, leaving the gift with the reunion', async () => {
            const seeded = await seedWithGift('pi_1')

            await cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            })

            expect(mockRefund).toHaveBeenCalledWith(
                'pi_1',
                16509,
                expect.stringContaining(seeded.registrationId),
            )
        })

        it('leaves the gift paid', async () => {
            const seeded = await seedWithGift('pi_1')

            await cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            })

            expect(await giftStatus(seeded.giftId)).toBe('paid')
        })

        /* A donor who is not told is a donor waiting for money that is not coming. */
        it('tells the registrant what was refunded and what was kept', async () => {
            const seeded = await seedWithGift('pi_1')

            await cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            })

            expect(mockSendCancellation.mock.calls[0][1]).toMatchObject({
                totalCents: 16509,
                keptDonationCents: 5000,
            })
        })

        /* An offline gift recorded against a paper entry rode on no charge, so there is nothing for
           a partial refund to protect and the card refund stays whole. */
        it('refunds the charge in full when the gift rode on no payment intent', async () => {
            const seeded = await seedWithGift(null)

            await cancelRegistrationAsAdmin({
                registrationId: seeded.registrationId,
                eventId: seeded.eventId,
                registerUrl: REGISTER_URL,
            })

            expect(mockRefund).toHaveBeenCalledWith('pi_1', undefined, expect.any(String))
            expect(await giftStatus(seeded.giftId)).toBe('paid')
        })
    })
})
