import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'

/* The event facts a public checkout needs: the opening and lock dates, for assertRegistrationOpen and
   assertRegistrationEditable, and the title, which names the payment in the Stripe dashboard and on
   any Stripe receipt. Undefined when the event does not exist. */
export async function getCheckoutEvent(
    eventId: string,
): Promise<
    | { title: string; registrationOpensAt: Date | null; registrationLockDate: Date | null }
    | undefined
> {
    const [row] = await db
        .select({
            title: reunionEvents.title,
            registrationOpensAt: reunionEvents.registrationOpensAt,
            registrationLockDate: reunionEvents.registrationLockDate,
        })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    return row
}
