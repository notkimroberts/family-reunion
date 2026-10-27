import { sumMemberPrices } from './sumMemberPrices'

/* What is still owed on a paid booking: the prices of the people an organizer added after it was
   paid, whom nobody has paid for since. Zero for every booking without such a person.

   These rows hold the NET tier price, so this is what Zelle or a check owes. A card payment costs
   more — see quoteAmountDue. */
export function sumAmountDue(
    members: readonly { priceCents: number; paymentDue: boolean }[],
): number {
    return sumMemberPrices(members.filter((member) => member.paymentDue))
}
