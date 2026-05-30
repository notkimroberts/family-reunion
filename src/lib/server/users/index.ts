import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { userProfiles } from '$lib/server/db/schema'
import { parseBirthDate } from '$lib/utils/age'

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

export async function upsertUserProfile(
    userId: string,
    data: {
        birthDate: string | null
        phone: string
        mailingAddress: { street: string; city: string; state: string; zip: string }
    },
): Promise<void> {
    const parsed = data.birthDate ? parseBirthDate(data.birthDate) : null
    const values = {
        userId,
        birthYear: parsed?.birthYear ?? null,
        birthMonth: parsed?.birthMonth ?? null,
        birthDay: parsed?.birthDay ?? null,
        phone: data.phone || null,
        mailingAddress: data.mailingAddress,
    }
    await db
        .insert(userProfiles)
        .values(values)
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: { ...values, updatedAt: new Date() },
        })
}

export async function softDeleteUser(userId: string): Promise<void> {
    await db
        .insert(userProfiles)
        .values({ userId, isDeleted: true, deletedAt: new Date() })
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
        })
}
