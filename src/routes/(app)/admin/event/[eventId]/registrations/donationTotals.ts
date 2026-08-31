import type { DonationSummary } from '$lib/server/donations'
import { stripeFeeOnChargeCents } from '$lib/utils/stripeFee'

/* What the year's gifts add up to, for the panel beside the list.

   A separate function from getRegistrationTotals rather than more fields on it: that type's whole
   contract is bookings — people, parties, places paid for — and gifts buy none of those. Mixing them
   would put money in "Collected" that no attendee corresponds to.

   Paid gifts only. A pending row is an abandoned checkout and a refunded one has gone back; neither
   is money the reunion has.

   NO REFUND-LOSS FIGURE HERE, unlike registrations. Stripe keeps its fee on a refunded charge, so a
   cancelled gift costs the reunion that fee too — but nothing in the app refunds a gift, so the case
   can only arrive by hand in the Stripe dashboard, and inventing a line for it would imply the app
   knows about a reversal it never sees. */
export type DonationTotals = {
    giftCount: number
    /* How many of those came in on a registration's charge rather than their own.

       Read only by the money panel's tooltip, which explains why gift fees can look low — and only
       says so when it is actually the case. Without this the note would appear beside every gift,
       including the standalone ones it does not describe. */
    attachedGiftCount: number
    /* What donors gave. Not grossed up — gifts are charged at face value. */
    grossCents: number
    /* Stripe's cut, per gift, because the 30¢ is per charge.

       Zero for a gift given during a registration checkout: it shared one charge and one balance
       transaction with the places, and that fee is already counted in the registration totals.
       Counting it here as well would deduct it twice from the same money. */
    feeCents: number
    netCents: number
    /* False when any fee above is the 2.9% + 30¢ estimate rather than the recorded figure. */
    feesAreExact: boolean
}

export function getDonationTotals(donations: DonationSummary[]): DonationTotals {
    const paid = donations.filter((donation) => donation.status === 'paid')

    /* A gift attached to a registration carries no fee of its own — see feeCents above. Everything
       else went through its own Stripe charge. */
    const standalone = paid.filter((donation) => donation.registrationId === null)

    const grossCents = paid.reduce((sum, donation) => sum + donation.amountCents, 0)
    const feeCents = standalone.reduce(
        (sum, donation) =>
            sum + (donation.stripeFeeCents ?? stripeFeeOnChargeCents(donation.amountCents)),
        0,
    )

    return {
        giftCount: paid.length,
        attachedGiftCount: paid.length - standalone.length,
        grossCents,
        feeCents,
        netCents: grossCents - feeCents,
        feesAreExact: standalone.every((donation) => donation.stripeFeeCents !== null),
    }
}
