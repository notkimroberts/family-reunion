import type { DonationTotals } from './donationTotals'
import type { RegistrationTotals } from './registrationTotals'

/* What the reunion has, as one figure, plus the lines that make it up.

   THE PANEL USED TO PRINT "In the bank" TWICE — once for registrations, once for gifts — and left
   the organiser to add them. That is the question the panel exists to answer, so it now answers it,
   and this is where the two are added.

   getRegistrationTotals and getDonationTotals stay separate and unchanged: bookings and gifts really
   are different things, one buys a chair and the other does not, and the admin list reports them
   apart. What was missing was the thing that adds them up.

   THE INVARIANT, which eventMoney.test.ts asserts against the real producers:

       registrationsCents + giftsCents − feeCents − lostToRefundsCents === bankedCents

   The panel renders those four as visible rows under the headline, so if this ever stops holding the
   figures on screen stop adding up. It holds because bankedCents is
   `cardPaid + offlinePaid − fee − lost` and netCents is `gross − giftFee`; nothing may be added to
   either total without deciding which side of this sum it belongs on. */
export type EventMoney = {
    /* The headline: registration money and gift money, both net of what Stripe took. */
    bankedCents: number
    /* What registrants paid, before fees. Card and cash together — the split is a tooltip detail,
       not a row, because only one of the two is still sitting in somebody's drawer. */
    registrationsCents: number
    /* What donors gave, before fees. */
    giftsCents: number
    giftCount: number
    /* How many of those shared a registration's charge. Drives one sentence of the tooltip, which
       must not explain a shared charge on a year that has none. */
    attachedGiftCount: number
    /* Stripe's cut on both sides, as one line. Kept whole rather than split per source: the
       organiser is reading "what came off the top", and two fee rows invite adding them. */
    feeCents: number
    /* Fees on cancelled card bookings — money gone with nobody attending. A separate term because
       it is a different kind of loss from a fee on money the reunion kept. */
    lostToRefundsCents: number
    /* Money owed. NOT part of the sum above, and rendered below a rule for that reason. */
    outstandingCents: number
    /* Cash and cheques counted in bankedCents that are not literally banked yet. Nothing here knows
       whether they have been deposited, which is exactly what the tooltip says. */
    toDepositCents: number
    /* False when EITHER side is estimating, because the headline is the two added together. */
    feesAreExact: boolean
    /* Whether there is any money to talk about, owed or received. Drives the empty state: a column
       of $0.00s invites the question every time. A comped-only year is false — nobody paid and
       nobody is going to, and the People block is where those places show up. */
    hasActivity: boolean
}

export function getEventMoney(totals: RegistrationTotals, gifts: DonationTotals): EventMoney {
    return {
        bankedCents: totals.bankedCents + gifts.netCents,
        registrationsCents: totals.paidCents,
        giftsCents: gifts.grossCents,
        giftCount: gifts.giftCount,
        attachedGiftCount: gifts.attachedGiftCount,
        feeCents: totals.feeCents + gifts.feeCents,
        lostToRefundsCents: totals.lostToRefundsCents,
        outstandingCents: totals.outstandingCents,
        toDepositCents: totals.offlinePaidCents,
        feesAreExact: totals.feesAreExact && gifts.feesAreExact,
        hasActivity:
            totals.paidCents > 0 ||
            gifts.grossCents > 0 ||
            totals.outstandingCents > 0 ||
            totals.lostToRefundsCents > 0,
    }
}
