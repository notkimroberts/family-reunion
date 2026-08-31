import { describe, expect, it } from 'vitest'
import { registrationStatusEnum } from '$lib/server/db/schema'
import { getPaymentState, type PaymentState, type RegistrationStatus } from '$lib/utils'
import { rowAccent } from './rowAccent'

/* Every payment state must decide, explicitly, what edge it gets.

   Refunded bookings had no edge — not by decision, but because rowAccent ended in a bare
   `return ''` and nobody had considered the state. A cancelled row sat in the list looking exactly
   like a waived one, which is the most expensive confusion available on this page: it counts towards
   nothing, and reading it as live means laying a place at a table.

   Waived is now sky rather than bare, so no state is unmarked and an edgeless row means a bug
   rather than a decision.

   The switch is exhaustive, so TypeScript rejects a new PaymentState with no case. That covers
   additions to the union; these tests cover the mapping itself, and — via the enum — that every
   registration status the database can hold reaches a state this function handles. */

/* Every state the union admits, listed so a new one has to be added here too. */
const ALL_STATES: PaymentState[] = [
    'paid_online',
    'paid_offline',
    'checkout_incomplete',
    'awaiting_payment',
    'waived',
    'cancelled',
]

/* The registration shapes that produce each state, since rowAccent takes a registration and not a
   state. The Stripe session is what distinguishes each pair: its presence means Checkout. */
const SHAPES: Record<PaymentState, { status: RegistrationStatus; stripeSessionId: string | null }> =
    {
        paid_online: { status: 'paid', stripeSessionId: 'cs_1' },
        paid_offline: { status: 'paid', stripeSessionId: null },
        checkout_incomplete: { status: 'pending', stripeSessionId: 'cs_1' },
        awaiting_payment: { status: 'pending', stripeSessionId: null },
        waived: { status: 'waived', stripeSessionId: null },
        cancelled: { status: 'refunded', stripeSessionId: 'cs_1' },
    }

describe('rowAccent', () => {
    /* The fixtures are only meaningful if each really produces the state it is filed under. */
    it.each(ALL_STATES)('the %s fixture really is that state', (state) => {
        expect(getPaymentState(SHAPES[state])).toBe(state)
    })

    it('marks a cancelled booking red', () => {
        expect(rowAccent(SHAPES.cancelled)).toContain('border-l-red-600')
    })

    it.each(['checkout_incomplete', 'awaiting_payment'] as const)('marks %s amber', (state) => {
        expect(rowAccent(SHAPES[state])).toContain('border-l-amber-500')
    })

    it.each(['paid_online', 'paid_offline'] as const)('marks %s green', (state) => {
        expect(rowAccent(SHAPES[state])).toContain('border-l-green-500')
    })

    /* Sky, the same hue as the Waived badge. Neither the green of money in nor the amber of money
       wanted: those people are coming and their money never will. */
    it('marks a waived booking sky', () => {
        expect(rowAccent(SHAPES.waived)).toContain('border-l-sky-500')
    })

    /* No state may be edgeless now, which is what makes a missing edge readable as a bug. */
    it.each(ALL_STATES)('gives %s an edge', (state) => {
        expect(rowAccent(SHAPES[state])).not.toBe('')
    })

    /* The colours must stay distinguishable — telling them apart down a column of rows is the
       entire purpose. Four, not six: both paid states share green and both pending states share
       amber, deliberately, because the edge answers "does this row want anything from me". */
    it('gives each meaning its own colour', () => {
        const colours = ALL_STATES.map((state) => rowAccent(SHAPES[state]))
        expect(new Set(colours).size).toBe(4)
    })

    /* Every state carries the same width and padding, so rows do not shift sideways depending on
       how the money went. */
    it.each(ALL_STATES)('%s keeps the row aligned', (state) => {
        expect(rowAccent(SHAPES[state])).toMatch(/^border-l-4 border-l-\S+ pl-3$/)
    })

    /* Guards the seam between the database and the union: a status the enum allows but
       getPaymentState forgot would fall through every case and return undefined. */
    it.each(registrationStatusEnum.enumValues)('handles a %s registration', (status) => {
        for (const stripeSessionId of ['cs_1', null]) {
            expect(ALL_STATES).toContain(getPaymentState({ status, stripeSessionId }))
            expect(typeof rowAccent({ status, stripeSessionId })).toBe('string')
        }
    })
})
