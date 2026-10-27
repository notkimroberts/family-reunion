import { sql } from 'drizzle-orm'
import { partyMembers } from '$lib/server/db/schema'

/* The aggregate for the owed part of a booking's total: the prices of members flagged paymentDue, which
   only a paid booking can have. Comes back as a string, or null over no rows, like any postgres
   sum(). */
export function amountDueSum() {
    return sql<
        string | null
    >`sum(case when ${partyMembers.paymentDue} then ${partyMembers.priceCents} else 0 end)`
}
