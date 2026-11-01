import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { user } from '$lib/server/db/schema'

/* Returns the id only if a user row actually exists for it, so the foreign key cannot reject the
   insert. Deliberately keyed on existence rather than on `dev`: a production account deleted
   mid-session hits the same case and must behave the same way. */
export async function resolveActorUserId(actorId: string): Promise<string | null> {
    const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, actorId))
        .limit(1)

    return existing?.id ?? null
}
