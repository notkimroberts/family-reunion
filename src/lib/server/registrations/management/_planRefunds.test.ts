import { describe, expect, it } from 'vitest'
import { planRefunds } from './_planRefunds'

/* How much goes back on each charge when a cancelled booking carried a gift.

   The rule this pins: a gift is KEPT, and Stripe refunds charges rather than line items, so keeping
   one means refunding less than the charge. Everything without a gift must keep refunding in full —
   `undefined`, Stripe's own default — because that is the behaviour every existing booking has and
   an arithmetic answer that merely happens to equal the charge is a figure that can drift. */

const member = (priceCents: number, stripePaymentIntentId: string | null = 'pi_1') => ({
    priceCents,
    stripePaymentIntentId,
})
const gift = (amountCents: number, stripePaymentIntentId: string | null = 'pi_1') => ({
    amountCents,
    stripePaymentIntentId,
})

describe('planRefunds', () => {
    it('refunds the whole charge when no gift rode on it', () => {
        expect(planRefunds({ intentIds: ['pi_1'], members: [member(16509)], gifts: [] })).toEqual([
            { intentId: 'pi_1', amountCents: undefined },
        ])
    })

    /* THE case. A full refund would hand back the gift too. */
    it('refunds the party only when a gift shares the charge', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1'],
                members: [member(16509)],
                gifts: [gift(5000)],
            }),
        ).toEqual([{ intentId: 'pi_1', amountCents: 16509 }])
    })

    it('sums every member on the charge', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1'],
                members: [member(16509), member(10300)],
                gifts: [gift(2500)],
            }),
        ).toEqual([{ intentId: 'pi_1', amountCents: 26809 }])
    })

    /* An offline gift rode on no charge, so there is nothing to protect and the refund stays whole. */
    it('ignores a gift with no payment intent', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1'],
                members: [member(16509)],
                gifts: [gift(5000, null)],
            }),
        ).toEqual([{ intentId: 'pi_1', amountCents: undefined }])
    })

    /* Each add_member is its own charge. Only the one carrying the gift goes partial; the others
       must not be quietly reduced. */
    it('leaves the other charges refunding in full', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1', 'pi_2'],
                members: [member(16509, 'pi_1'), member(10300, 'pi_2')],
                gifts: [gift(5000, 'pi_1')],
            }),
        ).toEqual([
            { intentId: 'pi_1', amountCents: 16509 },
            { intentId: 'pi_2', amountCents: undefined },
        ])
    })

    /* The fallback path: no member row names an intent because the id came off the Checkout session
       instead. There is exactly one charge, so every member belongs to it — without this the party's
       share computes as 0 and the registrant gets nothing back. */
    it('attributes every member to the single intent when no row names one', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1'],
                members: [member(16509, null), member(10300, null)],
                gifts: [gift(5000)],
            }),
        ).toEqual([{ intentId: 'pi_1', amountCents: 26809 }])
    })

    /* A charge that was the gift alone. Keeping the gift means sending nothing back — and a refund
       of zero is an error at Stripe, so it must be dropped rather than issued. */
    it('issues no refund for a charge that was only a gift', () => {
        expect(
            planRefunds({
                intentIds: ['pi_1', 'pi_2'],
                members: [member(16509, 'pi_1')],
                gifts: [gift(5000, 'pi_2')],
            }),
        ).toEqual([{ intentId: 'pi_1', amountCents: undefined }])
    })

    it('plans nothing when there is nothing to refund', () => {
        expect(planRefunds({ intentIds: [], members: [member(16509)], gifts: [] })).toEqual([])
    })
})
