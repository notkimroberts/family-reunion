import type { registrationStatusEnum } from '$lib/server/db/schema'

/* The registration states a confirmation email is ever sent for. 'refunded' is excluded —
   a cancelled registration gets no confirmation. */
export type ConfirmationStatus = Extract<
    (typeof registrationStatusEnum.enumValues)[number],
    'paid' | 'pending' | 'waived'
>

/* One row of the party table. priceCents is the snapshot from party_members, so it reflects
   what was actually charged rather than the tier's current price. */
export type ConfirmationPartyMember = {
    name: string
    tierLabel: string
    priceCents: number
    /* Optional parenthetical, e.g. "Age 8, Shirt M". Already assembled by the caller. */
    detail?: string
}

export type RegistrationConfirmationData = {
    name: string
    eventTitle: string
    eventDateRange?: string
    venueName?: string
    venueAddress?: string
    status: ConfirmationStatus
    /* Whether the money came through Stripe rather than to an organiser by hand. Changes the 'paid'
       copy only: card prices carry the processing fee, and "your payment has gone through" reads as
       a card charge to someone who handed over a cheque. Required so every producer decides. */
    paidByCard: boolean
    partyMembers: ConfirmationPartyMember[]
    totalCents: number
    /* A gift added to the same checkout, if there was one. Named on the confirmation because it is
       part of what the card was charged: a total that silently exceeds the party table reads as an
       overcharge. Absent, not zero, when no gift was given. */
    donationCents?: number
    viewUrl: string
    /* Set when an organiser changed an existing registration rather than a new one arriving. Swaps
       the heading and adds a lead saying so, but keeps the status money sentence below it — the
       amount owed or covered is just as relevant on an update as on a first confirmation. */
    isUpdate?: boolean
    /* What the organiser changed. Only rendered for an update. Without it the registrant gets a fresh
       copy of their details with no indication of what moved. */
    changeSummary?: RegistrationChange[]
}

/* One line of "What changed" in an update email. before and after are set when a value was edited,
   so the reader sees what it was and what it is now and can spot a wrong correction; absent for
   something with no earlier value, such as a person added to the party. */
export type RegistrationChange = {
    summary: string
    before?: string
    after?: string
}

/* Where the money goes when a registration is cancelled.

   This exists because "cancelled" alone cannot be written about honestly. A card payment goes back
   through Stripe automatically; a cheque or cash handed to an organiser does not, and telling that
   family "a refund has been issued" would be a straightforward lie followed by a phone call. A
   pending registration never paid, and a waived place never had anything to return.

   Derived from the registration itself rather than passed in by a caller's guess — see
   cancelRegistrationAsAdmin. */
export type RefundRoute = 'stripe' | 'by_hand' | 'nothing_paid' | 'waived'

export type CancellationEmailData = {
    name: string
    eventTitle: string
    /* Who was on the registration, so the email is a record of what was cancelled and not just a
       notice that something was. Each price is the snapshot that was charged, itemised where money
       goes back so the refund total can be checked against them. */
    partyMembers: Pick<ConfirmationPartyMember, 'name' | 'tierLabel' | 'priceCents'>[]
    /* Sum of the party's snapshotted prices — what the registration was worth. Rendered only when
       money is actually going back, since "$0.00 refunded" reads as a failed refund. */
    totalCents: number
    /* A gift the reunion is KEEPING. Someone cancelling their place has not asked for their gift
       back, so the refund is the places only — and a donor who is not told that is a donor waiting
       for money that is not coming. Zero or absent when there was no gift. */
    keptDonationCents?: number
    refundRoute: RefundRoute
    /* Where to start again. A cancellation is often a change of plan rather than a decision never to
       come, and the view link is dead by this point. */
    registerUrl: string
}

// What a standalone donation receipt needs to say
export type DonationReceiptData = {
    donorName: string
    eventTitle: string
    amountCents: number
    /* When the gift was paid. A receipt with no date cannot be matched to a card statement. */
    givenOn: Date
    /* The site's origin, for the header image. The other templates take it from a link they
       already carry; a receipt carries none. */
    siteOrigin: string
}
