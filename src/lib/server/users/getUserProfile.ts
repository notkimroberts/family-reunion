import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { userProfiles } from '$lib/server/db/schema'

// Fetches the user_profiles row for userId; returns undefined if no profile exists.
export async function getUserProfile(
    userId: string,
): Promise<typeof userProfiles.$inferSelect | undefined> {
    const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)
    return profile
}
