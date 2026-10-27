import { sql } from 'drizzle-orm'
import { registrations } from '$lib/server/db/schema'

/* The registrations update for a SECOND charge on a booking — an add_member or a member_payment:
   bump updatedAt and ADD the charge's fee to what the booking already cost.

   Added, not assigned, because each charge pays its own 2.9% + 30¢; coalesce covers rows that
   predate the column. Callers run it only inside the guard that settles the charge (a unique index or
   a conditional UPDATE), which is what keeps a redelivery from counting the fee twice. Undefined
   leaves the fee alone: Stripe could not tell us what it took. */
export function addedChargeFee(feeCents: number | undefined) {
    return {
        updatedAt: new Date(),
        ...(feeCents === undefined
            ? {}
            : { stripeFeeCents: sql`coalesce(${registrations.stripeFeeCents}, 0) + ${feeCents}` }),
    }
}
