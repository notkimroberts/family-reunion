import { and, count, eq, sum } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { donations } from '$lib/server/db/schema'

export type PublicDonationTotal = {
    /* Gross — what donors gave, not what survives Stripe's cut. This is a thank-you figure on a
       public page, and telling the family they have raised $482.50 of their $500 in gifts answers a
       question nobody asked. The admin panel shows the net. */
    totalCents: number
    giftCount: number
}

/* The "raised so far" figure for the home page and /donate.

   Paid only. A pending row is an abandoned checkout, and counting it would let anyone inflate the
   public total by opening a checkout and walking away. */
export async function getPublicDonationTotal(eventId: string): Promise<PublicDonationTotal> {
    const [row] = await db
        .select({ total: sum(donations.amountCents), gifts: count(donations.id) })
        .from(donations)
        .where(and(eq(donations.eventId, eventId), eq(donations.status, 'paid')))

    return {
        /* sum() is null over an empty set and a string otherwise — postgres returns numeric as text
           to avoid precision loss. */
        totalCents: Number(row?.total ?? 0),
        giftCount: row?.gifts ?? 0,
    }
}
