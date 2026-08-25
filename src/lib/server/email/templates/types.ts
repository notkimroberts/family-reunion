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
