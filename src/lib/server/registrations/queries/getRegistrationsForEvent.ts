import { count, desc, eq, sum } from 'drizzle-orm'
import type { HotelStayAnswer } from '$lib/general/constants'
import { db } from '$lib/server/db'
import { partyMembers, registrationStatusEnum, registrations } from '$lib/server/db/schema'

export type RegistrationSummary = {
    id: string
    contactName: string
    contactEmail: string
    contactPhone: string | null
    /* The enum, not a plain string. Drizzle already returns the union here — the hand-written
       annotation was pure widening, and it was load-bearing widening: it is why the admin LIST could
       not pass a row to getPaymentState, and so could not tell an abandoned Stripe checkout from a
       cheque that has not arrived. That distinction is the whole reason getPaymentState exists. */
    status: (typeof registrationStatusEnum.enumValues)[number]
    stripeSessionId: string | null
    /* For the dashboard deep link on a paid row. Null for anything not paid online. */
    stripePaymentIntentId: string | null
    /* What Stripe actually took, accumulated across every charge on this registration. Null for a
       row that predates the column or whose balance transaction could not be read — the money panel
       falls back to the 2.9% + 30¢ estimate for those and says so. */
    stripeFeeCents: number | null
    /* When the money arrived, or null when that was never recorded — see the column comment. Not
       updatedAt, which any later edit bumps. */
    paidAt: Date | null
    /* Whether this party plans to stay at the host hotel. Null means the booking predates the
       question, which is NOT the same as 'undecided' — see the column comment and getRoomSummary. */
    stayingAtHostHotel: HotelStayAnswer | null
    memberCount: number
    totalCents: number
    createdAt: Date
}

/* Every registration for one event, with its party size and total, for the admin list.

   One grouped query rather than a per-registration member lookup — the reunion could have a few
   hundred registrations and an N+1 there would be felt.

   The total sums party_members.priceCents, the snapshot of what was actually charged, so a later
   tier reprice never rewrites a historical total. Note that offline (admin-entered) members carry
   the net tier price while online ones carry the Stripe gross-up: each row records what that
   person actually cost, which is the honest figure, so a mixed party's total is a mix by design.

   Includes every status, cancelled ones too — an organiser needs to see that a registration was
   refunded, not have it vanish.

   stripeSessionId is returned so the list can distinguish a public registration abandoned at
   checkout from a paper one awaiting a cheque. Both are 'pending' and they need opposite
   follow-ups — see getPaymentState. */
export async function getRegistrationsForEvent(eventId: string): Promise<RegistrationSummary[]> {
    const rows = await db
        .select({
            id: registrations.id,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            contactPhone: registrations.contactPhone,
            status: registrations.status,
            stripeSessionId: registrations.stripeSessionId,
            stripePaymentIntentId: registrations.stripePaymentIntentId,
            stripeFeeCents: registrations.stripeFeeCents,
            paidAt: registrations.paidAt,
            stayingAtHostHotel: registrations.stayingAtHostHotel,
            createdAt: registrations.createdAt,
            memberCount: count(partyMembers.id),
            totalCents: sum(partyMembers.priceCents),
        })
        .from(registrations)
        /* Left join: a registration whose members were all removed still has to appear. */
        .leftJoin(partyMembers, eq(partyMembers.registrationId, registrations.id))
        .where(eq(registrations.eventId, eventId))
        .groupBy(registrations.id)
        .orderBy(desc(registrations.createdAt))

    return rows.map((row) => ({
        ...row,
        memberCount: Number(row.memberCount ?? 0),
        /* sum() comes back as a string (or null for no rows) from postgres. */
        totalCents: Number(row.totalCents ?? 0),
    }))
}
