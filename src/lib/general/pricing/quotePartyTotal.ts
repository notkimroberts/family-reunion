import { stripeFeeCents } from '$lib/utils/stripeFee'

export type PartyQuote = {
    /* Sum of the tier prices — the NET the reunion wants to receive. */
    subtotalCents: number
    /* Stripe's cut, summed PER MEMBER rather than taken off the subtotal.

       The 30¢ is a per-charge fee and the app grosses each member up individually, so a party of
       four carries it four times. Computing the fee on the subtotal instead would quote a number
       the server then contradicts at checkout. */
    feeCents: number
    /* A gift added to the same checkout, charged at face value. Zero when there is none. */
    donationCents: number
    /* What the card is actually charged. */
    totalCents: number
}

/* What a party costs, from the tier prices its members chose.

   Isomorphic on purpose. The server needs it to build the Stripe line items; the register page needs
   it to show the payer what they are about to be charged. It used to exist twice — `calculateTotal`
   under $lib/server, unreachable from a component, and a pair of `$derived` reductions in
   register/+page.svelte that re-derived the same arithmetic. Two implementations of "what do we
   charge" is one more than a payment form can afford.

   `applyStripeFee: false` is the paper-entry case. A cheque handed to an organiser costs the reunion
   nothing to process, so quoting a fee on it would invent a deduction Stripe never made — the same
   distinction the admin totals panel draws between card and offline money.

   `donationCents` rides on the total but NOT through the fee: a tier price is what the reunion must
   net, so the payer is grossed up to cover Stripe; a gift is whatever the giver chose to give, and
   charging $51.75 for a $50 gift reads as a mistake. It is also kept out of subtotalCents, so
   "Subtotal" stays the cost of the places. */
export function quotePartyTotal(
    netPriceCentsPerMember: readonly number[],
    options: { applyStripeFee?: boolean; donationCents?: number } = {},
): PartyQuote {
    const subtotalCents = netPriceCentsPerMember.reduce((sum, cents) => sum + cents, 0)
    const feeCents =
        options.applyStripeFee === false
            ? 0
            : netPriceCentsPerMember.reduce((sum, cents) => sum + stripeFeeCents(cents), 0)
    const donationCents = options.donationCents ?? 0
    return {
        subtotalCents,
        feeCents,
        donationCents,
        totalCents: subtotalCents + feeCents + donationCents,
    }
}
