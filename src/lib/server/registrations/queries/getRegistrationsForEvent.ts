import { count, desc, eq, sum } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'

export type RegistrationSummary = {
    id: string
    contactName: string
    contactEmail: string
    contactPhone: string | null
    status: string
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
   refunded, not have it vanish. */
export async function getRegistrationsForEvent(eventId: string): Promise<RegistrationSummary[]> {
    const rows = await db
        .select({
            id: registrations.id,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            contactPhone: registrations.contactPhone,
            status: registrations.status,
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
