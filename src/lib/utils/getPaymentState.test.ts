import { describe, it, expect } from 'vitest'
import { getMemberPaymentOrigin } from './getMemberPaymentOrigin'
import { getPaymentState } from './getPaymentState'

/* These two replace reading partyMembers.stripePaymentIntentId as "was this paid online".

   The bug they exist for, seen on a real admin page: a public registration that reached Stripe
   Checkout and was abandoned rendered as "Offline" — the same label a family paying by cheque gets.
   Its adult member also showed $165.09, the Stripe gross-up of the $160.00 tier, next to a $100.00
   net member added by an organiser, with nothing to explain the difference. Two opposite
   follow-ups, presented identically. */

const ONLINE = { stripeSessionId: 'cs_test_123' }
const OFFLINE = { stripeSessionId: null }

describe('getPaymentState', () => {
    it('distinguishes an abandoned checkout from money owed by post', () => {
        expect(getPaymentState({ status: 'pending', ...ONLINE })).toBe('checkout_incomplete')
        expect(getPaymentState({ status: 'pending', ...OFFLINE })).toBe('awaiting_payment')
    })

    /* The exact screenshot regression. */
    it('never reports a pending online registration as offline', () => {
        expect(getPaymentState({ status: 'pending', ...ONLINE })).not.toBe('paid_offline')
        expect(getPaymentState({ status: 'pending', ...ONLINE })).not.toBe('awaiting_payment')
    })

    it('separates paid online from paid by hand', () => {
        expect(getPaymentState({ status: 'paid', ...ONLINE })).toBe('paid_online')
        expect(getPaymentState({ status: 'paid', ...OFFLINE })).toBe('paid_offline')
    })

    /* Waived and refunded are about the registration, not the route, so a Stripe session must not
       change them — a comped party that once had a session is still comped. */
    it('ignores the session for waived and cancelled', () => {
        expect(getPaymentState({ status: 'waived', ...ONLINE })).toBe('waived')
        expect(getPaymentState({ status: 'waived', ...OFFLINE })).toBe('waived')
        expect(getPaymentState({ status: 'refunded', ...ONLINE })).toBe('cancelled')
        expect(getPaymentState({ status: 'refunded', ...OFFLINE })).toBe('cancelled')
    })
})

describe('getMemberPaymentOrigin', () => {
    const NO_PAYMENT = { stripePaymentIntentId: null, stripeCheckoutSessionId: null }

    it('reports a member of an abandoned checkout as unpaid, not offline', () => {
        expect(getMemberPaymentOrigin(NO_PAYMENT, ONLINE)).toBe('unpaid')
    })

    it('reports a hand-entered member as offline', () => {
        expect(getMemberPaymentOrigin(NO_PAYMENT, OFFLINE)).toBe('recorded_offline')
    })

    it('reports a settled member as paid online', () => {
        expect(
            getMemberPaymentOrigin(
                { stripePaymentIntentId: 'pi_1', stripeCheckoutSessionId: null },
                ONLINE,
            ),
        ).toBe('paid_online')
    })

    /* A member added through the add-member checkout has their own session. That is the most specific
       signal, so it wins over the payment intent backfilled across the whole registration. */
    it('prefers the member’s own checkout session over the backfilled intent', () => {
        expect(
            getMemberPaymentOrigin(
                { stripePaymentIntentId: 'pi_1', stripeCheckoutSessionId: 'cs_member_1' },
                ONLINE,
            ),
        ).toBe('added_online')
    })

    /* An offline addition to a party that DID pay online: the registration has a session, but this
       row has no payment columns of its own and was never charged. */
    it('does not claim an offline addition was paid because the party was', () => {
        expect(getMemberPaymentOrigin(NO_PAYMENT, ONLINE)).not.toBe('paid_online')
    })
})
