import { desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { reunionEvents } from '$lib/server/db/schema'

export async function getOpenEvent(): Promise<typeof reunionEvents.$inferSelect | undefined> {
    const [event] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)
    return event
}
