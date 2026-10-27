import { grossUpForStripe } from '$lib/utils/stripeFee'
import { quotePartyTotal } from './quotePartyTotal'

export type AmountDueLine = {
    memberId: string
    name: string
    tierLabel: string
    netCents: number
    grossCents: number
}

export type AmountDueQuote = {
    lines: AmountDueLine[]
    /* What Zelle or a check owes. */
    netCents: number
    /* The card processing fee a card payment adds on top. */
    feeCents: number
    /* What the card is charged. */
    cardTotalCents: number
}

/* What a card payment for the people still owed on a paid booking would charge.

   Each place is grossed up on its own, as buildCheckoutLineItems does for a new booking, because
   Stripe's 30¢ is charged per line. The pay page shows this and the Stripe session is built from it,
   so the figure a payer reads and the figure they are charged come off one function. */
export function quoteAmountDue(
    members: readonly {
        id: string
        name: string
        tierLabel: string
        priceCents: number
        paymentDue: boolean
    }[],
): AmountDueQuote {
    const lines = members
        .filter((member) => member.paymentDue)
        .map((member) => ({
            memberId: member.id,
            name: member.name,
            tierLabel: member.tierLabel,
            netCents: member.priceCents,
            grossCents: grossUpForStripe(member.priceCents),
        }))
    /* The totals are a party quote over the owed places, so the pay page and the register page
       cannot price the same people two ways. */
    const quote = quotePartyTotal(lines.map((line) => line.netCents))
    return {
        lines,
        netCents: quote.subtotalCents,
        feeCents: quote.feeCents,
        cardTotalCents: quote.totalCents,
    }
}
