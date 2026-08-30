import type { TierPricing } from '$lib/server/tiers'
import { grossUpForStripe } from '$lib/utils/stripeFee'
import type { MemberInput } from './MemberInput'

export type CheckoutLineItem = {
    name: string
    netCents: number
    grossCents: number
}

/* The Stripe line items for a new registration: one per person, priced at the gross.

   Tier prices are what the reunion wants to NET, so each is grossed up individually — Stripe's 30¢
   is charged per line, and quoting it any other way would disagree with what the register page
   shows the payer. The page derives its figures from quotePartyTotal, and the two cannot drift:
   stripeFeeCents is defined as grossUpForStripe(net) - net, so both sides come off one formula.

   This used to be calculateTotal and also returned netCents, feeCents and totalCents. Its one caller
   destructured `{ lineItems }` and nothing ever read the other three, so the name promised a
   calculation the codebase did not want. The totals live in $lib/general/pricing, where the register
   page can reach them too. */
export function buildCheckoutLineItems(
    members: readonly MemberInput[],
    pricingByTierId: Record<string, TierPricing>,
): CheckoutLineItem[] {
    return members.map((member) => {
        const pricing = pricingByTierId[member.tierId]
        return {
            name: `${member.name} (${pricing.label})`,
            netCents: pricing.priceCents,
            grossCents: grossUpForStripe(pricing.priceCents),
        }
    })
}
