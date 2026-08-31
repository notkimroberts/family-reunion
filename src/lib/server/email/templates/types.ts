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
    /* Optional parenthetical, e.g. "age 8, shirt M". Already assembled by the caller. */
    detail?: string
}

export type RegistrationConfirmationData = {
    name: string
    eventTitle: string
    eventDateRange?: string
    venueName?: string
    venueAddress?: string
    status: ConfirmationStatus
    partyMembers: ConfirmationPartyMember[]
    totalCents: number
    manageUrl: string
    /* Set when an organiser changed an existing registration rather than a new one arriving. Swaps
       the heading and adds a lead saying so, but keeps the status money sentence below it — the
       amount owed or covered is just as relevant on an update as on a first confirmation. */
    isUpdate?: boolean
    /* Human-readable lines describing what the organiser changed, e.g. "Payment recorded as paid".
       Only rendered for an update. Without it the registrant gets a fresh copy of their details with
       no indication of what moved. */
    changeSummary?: string[]
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
       notice that something was. Names only: the money is one number below. */
    partyNames: string[]
    /* Sum of the party's snapshotted prices — what the registration was worth. Rendered only when
       money is actually going back, since "$0.00 refunded" reads as a failed refund. */
    totalCents: number
    refundRoute: RefundRoute
    /* Where to start again. A cancellation is often a change of plan rather than a decision never to
       come, and the management link is dead by this point. */
    registerUrl: string
}
