import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, reunionEvents } from '$lib/server/db/schema'

// Fetches registration and its parent event in one query; undefined when the registration does not exist.
export async function getRegistrationWithEvent(registrationId: string): Promise<
    | {
          registration: typeof registrations.$inferSelect
          event: typeof reunionEvents.$inferSelect
      }
    | undefined
> {
    const [result] = await db
        .select({ registration: registrations, event: reunionEvents })
        .from(registrations)
        .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
        .where(eq(registrations.id, registrationId))
        .limit(1)
    return result
}
