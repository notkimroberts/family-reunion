import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'

/* The only writer of status 'refunded'.

   Two paths reach this state and they look nothing alike: cancelling a whole registration, and
   removing the last remaining person from one a member at a time. Both were writing the column
   themselves, which meant `setRegistrationStatus` — the module named as if it owned the lifecycle —
   was the one place that could NOT produce it, while refusing it in both directions and explaining
   at length that cancelling was the proper route. The proper route then bypassed it.

   The refusal in setRegistrationStatus is still right: setting the column without issuing the refund
   would tell every surface the money went back when it had not. What was wrong was that the
   transition had no owner. This is the owner.

   CALL THIS ONLY AFTER THE MONEY IS BACK. Every caller must have settled its refunds first and
   aborted loudly if any failed — see _performCancellation, which does exactly that, and the tests
   that pin it. */
export async function markRegistrationRefunded(registrationId: string): Promise<void> {
    await db
        .update(registrations)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(registrations.id, registrationId))
}
