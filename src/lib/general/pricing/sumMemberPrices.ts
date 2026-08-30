/* What a registration is worth, from the prices snapshotted onto its party members.

   Distinct from quotePartyTotal, and the difference matters. That one prices a party that has not
   paid yet, from today's tier prices. This one adds up what was actually charged, recorded per row
   at the time — so a later tier rename or reprice never rewrites a historical total or a refund
   amount.

   It was the same three-line reduction in four places: the registrant's manage page, the admin
   registration page's load, the confirmation email, and the cancellation email. */
export function sumMemberPrices(members: readonly { priceCents: number }[]): number {
    return members.reduce((sum, member) => sum + member.priceCents, 0)
}
