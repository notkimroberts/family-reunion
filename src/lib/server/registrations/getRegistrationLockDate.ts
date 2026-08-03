import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'

/* Single-table lookup for callers that only have an eventId in scope (not already joined
   to reunion_events) and need the lock date to pass to assertRegistrationEditable. */
export async function getRegistrationLockDate(eventId: string): Promise<Date | null> {
    const [row] = await db
        .select({ registrationLockDate: reunionEvents.registrationLockDate })
        .from(reunionEvents)
        .where(eq(reunionEvents.id, eventId))
        .limit(1)
    return row?.registrationLockDate ?? null
}
