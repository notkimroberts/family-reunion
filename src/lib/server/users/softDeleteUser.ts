import { db } from '$lib/server/db'
import { userProfiles } from '$lib/server/db/schema'

// Upserts user_profiles with isDeleted=true and deletedAt timestamp; does not remove the row.
export async function softDeleteUser(userId: string): Promise<void> {
    await db
        .insert(userProfiles)
        .values({ userId, isDeleted: true, deletedAt: new Date() })
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
        })
}
